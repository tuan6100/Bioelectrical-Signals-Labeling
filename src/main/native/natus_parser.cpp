#include "natus_parser.hpp"
#include "fast_number_parser.hpp"
#include "crc32.hpp"
#include <fstream>
#include <sstream>
#include <regex>
#include <algorithm>
#include <map>

namespace biosignal {

std::string NatusParser::toLower(std::string_view s) {
    std::string res;
    res.reserve(s.size());
    for (char c : s) {
        res.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
    }
    return res;
}

std::string NatusParser::trim(std::string_view s) {
    size_t start = 0;
    while (start < s.size() && std::isspace(static_cast<unsigned char>(s[start]))) ++start;
    size_t end = s.size();
    while (end > start && std::isspace(static_cast<unsigned char>(s[end - 1]))) --end;
    return std::string(s.substr(start, end - start));
}

bool NatusParser::isNatusSignature(const std::string& text) {
    if (text.empty()) return false;
    // Check first ~5 lines
    size_t count = 0;
    size_t pos = 0;
    while (pos < text.size() && count < 5) {
        size_t nextPos = text.find('\n', pos);
        if (nextPos == std::string::npos) {
            nextPos = text.size();
        }
        std::string line = text.substr(pos, nextPos - pos);
        std::string lowerLine = toLower(line);
        if (lowerLine.find("viking v.") != std::string::npos && lowerLine.find("natus") != std::string::npos) {
            return true;
        }
        pos = nextPos + 1;
        count++;
    }
    return false;
}

std::string NatusParser::readUtf16leFile(const std::string& filePath) {
    std::ifstream file(filePath, std::ios::binary | std::ios::ate);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filePath);
    }

    std::streamsize fileSize = file.tellg();
    if (fileSize < 2) {
        return "";
    }

    std::vector<uint8_t> buffer(fileSize);
    file.seekg(0, std::ios::beg);
    file.read(reinterpret_cast<char*>(buffer.data()), fileSize);

    size_t startOffset = 0;
    if (buffer[0] == 0xFF && buffer[1] == 0xFE) {
        startOffset = 2;
    }

    std::string utf8;
    utf8.reserve(fileSize / 2 + 64);

    for (size_t i = startOffset; i + 1 < buffer.size(); i += 2) {
        uint16_t codeUnit = static_cast<uint16_t>(buffer[i]) |  (static_cast<uint16_t>(buffer[i + 1]) << 8);

        if (codeUnit < 0x80) {
            utf8.push_back(static_cast<char>(codeUnit));
        } else if (codeUnit < 0x800) {
            utf8.push_back(static_cast<char>(0xC0 | (codeUnit >> 6)));
            utf8.push_back(static_cast<char>(0x80 | (codeUnit & 0x3F)));
        } else if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF && i + 3 < buffer.size()) {
            uint16_t high = codeUnit;
            uint16_t low = static_cast<uint16_t>(buffer[i + 2]) |
                           (static_cast<uint16_t>(buffer[i + 3]) << 8);
            if (low >= 0xDC00 && low <= 0xDFFF) {
                i += 2;
                uint32_t cp = 0x10000 + (((high - 0xD800) << 10) | (low - 0xDC00));
                utf8.push_back(static_cast<char>(0xF0 | (cp >> 18)));
                utf8.push_back(static_cast<char>(0x80 | ((cp >> 12) & 0x3F)));
                utf8.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
                utf8.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
            }
        } else {
            utf8.push_back(static_cast<char>(0xE0 | (codeUnit >> 12)));
            utf8.push_back(static_cast<char>(0x80 | ((codeUnit >> 6) & 0x3F)));
            utf8.push_back(static_cast<char>(0x80 | (codeUnit & 0x3F)));
        }
    }

    return utf8;
}

double NatusParser::getUnitScale(const std::unordered_map<std::string, std::string>& obj) {
    for (const auto& [k, v] : obj) {
        std::string kLower = toLower(k);
        if (kLower.find("adc unit") != std::string::npos) {
            double val = 1.0;
            if (FastNumberParser::parseDouble(v, val)) {
                if (kLower.find("mv") != std::string::npos) {
                    return val * 1000.0;
                }
                return val;
            }
        }
    }
    return 1.0;
}

double NatusParser::deriveScale(std::string_view matchedKey,
                                const std::unordered_map<std::string, std::string>& dataObj,
                                const std::unordered_map<std::string, std::string>& containerObj) {
    std::string keyLower = toLower(matchedKey);
    if (keyLower.find("(µv)") != std::string::npos || keyLower.find("(uv)") != std::string::npos) {
        return 1.0;
    }
    if (keyLower.find("(mv)") != std::string::npos) {
        return 1000.0;
    }
    double scale = getUnitScale(dataObj);
    if (scale != 1.0) return scale;
    scale = getUnitScale(containerObj);
    return scale;
}

NatusParseResult NatusParser::parseFile(const std::string& filePath) {
    std::string text = readUtf16leFile(filePath);
    return parseText(std::move(text), filePath);
}

struct RawSweep {
    int channelNumber = 1;
    std::vector<double> samples;
    double samplingFrequencyKhz = 0.0;
    double subsampledKhz = 0.0;
    double durationMs = 0.0;
};

NatusParseResult NatusParser::parseText(std::string text, const std::string& fileName) {
    NatusParseResult result;
    if (text.empty()) return result;

    result.contentHash = Crc32::toHexString(Crc32::calculate(text));
    result.isNatus = isNatusSignature(text);

    std::string cleaned;
    cleaned.reserve(text.size());
    for (size_t i = 0; i < text.size(); ++i) {
        if (text[i] == '/' && i + 1 < text.size()) {
            if (text[i + 1] == '\n') {
                cleaned.push_back(',');
                i += 1;
                continue;
            } else if (text[i + 1] == '\r' && i + 2 < text.size() && text[i + 2] == '\n') {
                cleaned.push_back(',');
                i += 2;
                continue;
            }
        }
        cleaned.push_back(text[i]);
    }

    struct Section {
        std::string path;
        std::string name;
        std::unordered_map<std::string, std::string> kvs;
    };

    std::vector<Section> sections;
    Section* currentSection = nullptr;

    std::unordered_map<std::string, std::string> allKeyValues;

    size_t lineStart = 0;
    while (lineStart < cleaned.size()) {
        size_t lineEnd = cleaned.find('\n', lineStart);
        if (lineEnd == std::string::npos) lineEnd = cleaned.size();

        std::string_view rawLine(cleaned.data() + lineStart, lineEnd - lineStart);
        lineStart = lineEnd + 1;

        std::string line = trim(rawLine);
        if (line.empty() || line[0] == ';' || line.rfind("...", 0) == 0) {
            continue;
        }
        if (line[0] == '[') {
            size_t closeBracket = line.find(']');
            if (closeBracket != std::string::npos) {
                std::string header = line.substr(1, closeBracket - 1);
                size_t dash = header.find('-');
                if (dash != std::string::npos) {
                    std::string pathStr = trim(header.substr(0, dash));
                    std::string nameStr = trim(header.substr(dash + 1));

                    sections.push_back(Section{pathStr, nameStr, {}});
                    currentSection = &sections.back();

                    // Check for inline kv after ]
                    std::string rest = trim(line.substr(closeBracket + 1));
                    if (!rest.empty()) {
                        size_t eq = rest.find('=');
                        if (eq != std::string::npos) {
                            std::string k = trim(rest.substr(0, eq));
                            std::string v = trim(rest.substr(eq + 1));
                            currentSection->kvs[k] = v;
                            allKeyValues[k] = v;
                        }
                    }
                    continue;
                }
            }
        }

        size_t eq = line.find('=');
        if (eq != std::string::npos) {
            std::string k = trim(line.substr(0, eq));
            std::string v = trim(line.substr(eq + 1));
            if (currentSection) {
                currentSection->kvs[k] = v;
            }
            allKeyValues[k] = v;
        }
    }

    for (const auto& [k, v] : allKeyValues) {
        std::string kLower = toLower(k);
        if (kLower == "patient id") {
            result.metadata.patientId = v;
        } else if (kLower == "first name") {
            result.metadata.firstName = v;
        } else if (kLower == "gender") {
            result.metadata.gender = (!v.empty() && (v[0] == 'M' || v[0] == 'm')) ? "M" : "F";
        } else if (kLower == "test") {
            std::string vUpper = v;
            for (char& c : vUpper) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
            if (vUpper.find("ECG") != std::string::npos) result.metadata.measurementType = "ECG";
            else if (vUpper.find("EEG") != std::string::npos) result.metadata.measurementType = "EEG";
            else if (vUpper.find("EMG") != std::string::npos) result.metadata.measurementType = "EMG";
            else result.metadata.measurementType = "UNKNOWN";
        } else if (kLower == "acquisition start time") {
            result.metadata.startTime = v;
        } else if (kLower == "acquisition end time") {
            result.metadata.endTime = v;
        }
    }

    std::vector<RawSweep> longTraceSweeps;
    std::vector<RawSweep> traceSweeps;
    int lastChannelNumber = 1;

    for (size_t sIdx = 0; sIdx < sections.size(); ++sIdx) {
        const auto& sec = sections[sIdx];
        std::string nameLower = toLower(sec.name);

        std::unordered_map<std::string, std::string> parentKvs;
        size_t lastDot = sec.path.rfind('.');
        if (lastDot != std::string::npos) {
            std::string parentPath = sec.path.substr(0, lastDot);
            for (const auto& otherSec : sections) {
                if (otherSec.path == parentPath) {
                    parentKvs = otherSec.kvs;
                    break;
                }
            }
        }

        int channelNumber = lastChannelNumber;
        auto itCh = sec.kvs.find("Channel number");
        if (itCh == sec.kvs.end()) itCh = sec.kvs.find("Channel Number");
        if (itCh == sec.kvs.end()) itCh = parentKvs.find("Channel number");
        if (itCh == sec.kvs.end()) itCh = parentKvs.find("Channel Number");

        if (itCh != sec.kvs.end()) {
            double chVal = 0.0;
            if (FastNumberParser::parseDouble(itCh->second, chVal)) {
                channelNumber = static_cast<int>(chVal);
                lastChannelNumber = channelNumber;
            }
        }

        if (nameLower.find("longtrace data") != std::string::npos || sec.kvs.count("LongTrace Data")) {
            std::string sampleKey;
            std::string sampleVal;
            for (const auto& [k, v] : sec.kvs) {
                std::string kl = toLower(k);
                if (kl.find("longtrace data") != std::string::npos || kl.find("sweep data") != std::string::npos) {
                    sampleKey = k;
                    sampleVal = v;
                    break;
                }
            }

            if (!sampleVal.empty()) {
                double scale = deriveScale(sampleKey, sec.kvs, parentKvs);
                std::vector<double> samples = FastNumberParser::parseSamples(sampleVal, scale);
                if (!samples.empty()) {
                    double subKhz = 0.0;
                    double freqKhz = 0.0;
                    double durMs = 0.0;

                    for (const auto& [k, v] : sec.kvs) {
                        std::string kl = toLower(k);
                        if (kl.find("subsampled(khz)") != std::string::npos) FastNumberParser::parseDouble(v, subKhz);
                        if (kl.find("sampling frequency(khz)") != std::string::npos) FastNumberParser::parseDouble(v, freqKhz);
                        if (kl.find("sweep duration(ms)") != std::string::npos) FastNumberParser::parseDouble(v, durMs);
                    }
                    if (subKhz <= 0.0) subKhz = freqKhz > 0.0 ? freqKhz : 19.2;
                    if (freqKhz <= 0.0) freqKhz = subKhz;
                    if (durMs <= 0.0 && subKhz > 0.0) durMs = samples.size() / subKhz;

                    longTraceSweeps.push_back(RawSweep{channelNumber, std::move(samples), freqKhz, subKhz, durMs});
                }
            }
        } else if (nameLower.find("trace data") != std::string::npos || sec.kvs.count("Trace Data")) {
            std::string sampleKey;
            std::string sampleVal;
            for (const auto& [k, v] : sec.kvs) {
                std::string kl = toLower(k);
                if (kl.find("sweep data") != std::string::npos) {
                    sampleKey = k;
                    sampleVal = v;
                    break;
                }
            }
            if (!sampleVal.empty()) {
                double scale = deriveScale(sampleKey, sec.kvs, parentKvs);
                std::vector<double> samples = FastNumberParser::parseSamples(sampleVal, scale);
                if (!samples.empty()) {
                    double subKhz = 0.0;
                    double freqKhz = 0.0;
                    double durMs = 0.0;
                    for (const auto& [k, v] : sec.kvs) {
                        std::string kl = toLower(k);
                        if (kl.find("subsampled(khz)") != std::string::npos) FastNumberParser::parseDouble(v, subKhz);
                        if (kl.find("sampling frequency(khz)") != std::string::npos) FastNumberParser::parseDouble(v, freqKhz);
                        if (kl.find("sweep duration(ms)") != std::string::npos) FastNumberParser::parseDouble(v, durMs);
                    }
                    if (subKhz <= 0.0) subKhz = freqKhz > 0.0 ? freqKhz : 19.2;
                    if (freqKhz <= 0.0) freqKhz = subKhz;
                    if (durMs <= 0.0 && subKhz > 0.0) durMs = samples.size() / subKhz;

                    traceSweeps.push_back(RawSweep{channelNumber, std::move(samples), freqKhz, subKhz, durMs});
                }
            }
        } else if (nameLower.find("store data") != std::string::npos || sec.kvs.count("Store Data")) {
            std::string sampleKey;
            std::string sampleVal;
            for (const auto& [k, v] : sec.kvs) {
                std::string kl = toLower(k);
                if (kl.find("averaged data") != std::string::npos) {
                    sampleKey = k;
                    sampleVal = v;
                    break;
                }
            }
            if (!sampleVal.empty()) {
                double scale = deriveScale(sampleKey, sec.kvs, parentKvs);
                std::vector<double> samples = FastNumberParser::parseSamples(sampleVal, scale);
                if (!samples.empty()) {
                    double subKhz = 0.0;
                    double freqKhz = 0.0;
                    double durMs = 0.0;
                    for (const auto& [k, v] : sec.kvs) {
                        std::string kl = toLower(k);
                        if (kl.find("subsampled(khz)") != std::string::npos) FastNumberParser::parseDouble(v, subKhz);
                        if (kl.find("sampling frequency(khz)") != std::string::npos) FastNumberParser::parseDouble(v, freqKhz);
                        if (kl.find("sweep duration(ms)") != std::string::npos) FastNumberParser::parseDouble(v, durMs);
                    }
                    ChannelData ch;
                    ch.channelNumber = channelNumber;
                    ch.dataType = "Averaged Data";
                    ch.samples = std::move(samples);
                    ch.samplingFrequencyKhz = freqKhz;
                    ch.subsampledKhz = subKhz;
                    ch.durationMs = durMs;
                    result.channels.push_back(std::move(ch));
                }
            }
        }
    }

    if (!longTraceSweeps.empty()) {
        std::map<int, std::vector<RawSweep>> grouped;
        for (auto& s : longTraceSweeps) {
            grouped[s.channelNumber].push_back(std::move(s));
        }

        for (auto& [chNum, list] : grouped) {
            ChannelData ch;
            ch.channelNumber = chNum;
            ch.dataType = "LongTrace Data";
            ch.subsampledKhz = list[0].subsampledKhz;
            ch.samplingFrequencyKhz = list[0].samplingFrequencyKhz;

            size_t totalSamples = 0;
            for (const auto& item : list) totalSamples += item.samples.size();
            ch.samples.reserve(totalSamples);
            for (auto& item : list) {
                ch.samples.insert(ch.samples.end(), item.samples.begin(), item.samples.end());
            }

            double subKhz = ch.subsampledKhz > 0.0 ? ch.subsampledKhz : 19.2;
            ch.durationMs = static_cast<double>(ch.samples.size()) / subKhz;
            result.channels.push_back(std::move(ch));
        }
    }

    if (!traceSweeps.empty()) {
        std::map<int, std::vector<RawSweep>> grouped;
        for (auto& s : traceSweeps) {
            grouped[s.channelNumber].push_back(std::move(s));
        }

        for (auto& [chNum, list] : grouped) {
            ChannelData ch;
            ch.channelNumber = chNum;
            ch.dataType = "Trace Data";
            ch.subsampledKhz = list[0].subsampledKhz;
            ch.samplingFrequencyKhz = list[0].samplingFrequencyKhz;

            size_t totalSamples = 0;
            for (const auto& item : list) totalSamples += item.samples.size();
            ch.samples.reserve(totalSamples);
            for (auto& item : list) {
                ch.samples.insert(ch.samples.end(), item.samples.begin(), item.samples.end());
            }

            double subKhz = ch.subsampledKhz > 0.0 ? ch.subsampledKhz : 19.2;
            ch.durationMs = static_cast<double>(ch.samples.size()) / subKhz;
            result.channels.push_back(std::move(ch));
        }
    }

    return result;
}

} // namespace biosignal
