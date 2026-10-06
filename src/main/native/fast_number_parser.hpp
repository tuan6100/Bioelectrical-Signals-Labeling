#pragma once
#include <string_view>
#include <vector>
#include <cmath>
#include <cctype>

namespace biosignal {

class FastNumberParser {
public:
    static double round8(double val) {
        return std::round(val * 1e8) / 1e8;
    }

    static bool parseDouble(std::string_view s, double& outVal) {
        size_t i = 0;
        size_t n = s.size();

        while (i < n && std::isspace(static_cast<unsigned char>(s[i]))) ++i;
        if (i >= n) return false;

        bool negative = false;
        if (s[i] == '-') {
            negative = true;
            ++i;
        } else if (s[i] == '+') {
            ++i;
        }

        if (i >= n) return false;

        double integerPart = 0.0;
        bool hasDigits = false;
        while (i < n && std::isdigit(static_cast<unsigned char>(s[i]))) {
            integerPart = integerPart * 10.0 + (s[i] - '0');
            hasDigits = true;
            ++i;
        }

        double fractionPart = 0.0;
        double divisor = 1.0;
        if (i < n && (s[i] == '.' || s[i] == ',')) {
            ++i;
            while (i < n && std::isdigit(static_cast<unsigned char>(s[i]))) {
                fractionPart = fractionPart * 10.0 + (s[i] - '0');
                divisor *= 10.0;
                hasDigits = true;
                ++i;
            }
        }

        if (!hasDigits) return false;

        double val = integerPart + (fractionPart / divisor);

        // Check for exponent 'e' or 'E'
        if (i < n && (s[i] == 'e' || s[i] == 'E')) {
            ++i;
            bool expNegative = false;
            if (i < n && s[i] == '-') {
                expNegative = true;
                ++i;
            } else if (i < n && s[i] == '+') {
                ++i;
            }
            int exponent = 0;
            while (i < n && std::isdigit(static_cast<unsigned char>(s[i]))) {
                exponent = exponent * 10 + (s[i] - '0');
                ++i;
            }
            if (expNegative) {
                val /= std::pow(10.0, exponent);
            } else {
                val *= std::pow(10.0, exponent);
            }
        }

        outVal = negative ? -val : val;
        return true;
    }

    static std::vector<double> parseSamples(std::string_view raw, double scale = 1.0) {
        std::vector<double> samples;
        if (raw.empty()) return samples;
        samples.reserve(raw.size() / 4 + 1);

        size_t start = 0;
        size_t len = raw.size();
        while (start < len && std::isspace(static_cast<unsigned char>(raw[start]))) ++start;
        if (start < len && raw[start] == '[') ++start;

        while (len > start && (std::isspace(static_cast<unsigned char>(raw[len - 1])) || raw[len - 1] == ']')) {
            --len;
        }

        size_t i = start;
        while (i < len) {
            size_t delim = raw.find(',', i);
            if (delim == std::string_view::npos || delim > len) {
                delim = len;
            }

            std::string_view token = raw.substr(i, delim - i);
            double val = 0.0;
            if (parseDouble(token, val)) {
                samples.push_back(round8(val * scale));
            }

            i = delim + 1;
        }

        return samples;
    }
};

} // namespace biosignal
