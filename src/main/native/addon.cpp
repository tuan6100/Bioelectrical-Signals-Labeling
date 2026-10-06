#include <napi.h>
#include "crc32.hpp"
#include "natus_parser.hpp"
#include "signal_processing.hpp"
#include "fast_number_parser.hpp"
#include <charconv>
#include <sstream>

using namespace biosignal;

// CRC32 calculation
Napi::Value CalculateCRC32(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string text = info[0].As<Napi::String>().Utf8Value();
    uint32_t crc = Crc32::calculate(text);
    return Napi::String::New(env, Crc32::toHexString(crc));
}

// Natus signature validation
Napi::Value IsNatusSignature(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        return Napi::Boolean::New(env, false);
    }
    std::string text = info[0].As<Napi::String>().Utf8Value();
    return Napi::Boolean::New(env, NatusParser::isNatusSignature(text));
}

// Helper to convert NatusParseResult to Napi::Object
Napi::Object ConvertParseResultToJs(Napi::Env env, const NatusParseResult& res) {
    Napi::Object out = Napi::Object::New(env);
    out.Set("isNatus", Napi::Boolean::New(env, res.isNatus));
    out.Set("contentHash", Napi::String::New(env, res.contentHash));

    Napi::Object meta = Napi::Object::New(env);
    meta.Set("patientId", Napi::String::New(env, res.metadata.patientId));
    meta.Set("firstName", Napi::String::New(env, res.metadata.firstName));
    meta.Set("gender", Napi::String::New(env, res.metadata.gender));
    meta.Set("measurementType", Napi::String::New(env, res.metadata.measurementType));
    meta.Set("startTime", Napi::String::New(env, res.metadata.startTime));
    meta.Set("endTime", Napi::String::New(env, res.metadata.endTime));
    out.Set("metadata", meta);

    Napi::Array chArr = Napi::Array::New(env, res.channels.size());
    for (size_t i = 0; i < res.channels.size(); ++i) {
        const auto& ch = res.channels[i];
        Napi::Object chObj = Napi::Object::New(env);
        chObj.Set("channelNumber", Napi::Number::New(env, ch.channelNumber));
        chObj.Set("dataType", Napi::String::New(env, ch.dataType));
        chObj.Set("samplingFrequencyKhz", Napi::Number::New(env, ch.samplingFrequencyKhz));
        chObj.Set("subsampledKhz", Napi::Number::New(env, ch.subsampledKhz));
        chObj.Set("durationMs", Napi::Number::New(env, ch.durationMs));

        // Create Float64Array for direct high-speed JS access
        Napi::Float64Array samplesArr = Napi::Float64Array::New(env, ch.samples.size());
        double* pSamples = samplesArr.Data();
        for (size_t s = 0; s < ch.samples.size(); ++s) {
            pSamples[s] = ch.samples[s];
        }
        chObj.Set("samples", samplesArr);

        // Pre-generate JSON string for direct SQLite insertion using ultra-fast std::to_chars
        std::string jsonStr;
        jsonStr.reserve(ch.samples.size() * 12 + 2);
        jsonStr.push_back('[');
        char numBuf[32];
        for (size_t s = 0; s < ch.samples.size(); ++s) {
            if (s > 0) jsonStr.push_back(',');
            auto [ptr, ec] = std::to_chars(numBuf, numBuf + sizeof(numBuf), ch.samples[s]);
            jsonStr.append(numBuf, ptr - numBuf);
        }
        jsonStr.push_back(']');
        chObj.Set("rawSamplesJson", Napi::String::New(env, jsonStr));

        chArr.Set(i, chObj);
    }
    out.Set("channels", chArr);
    return out;
}

// Parse Natus text
Napi::Value ParseNatusText(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string text = info[0].As<Napi::String>().Utf8Value();
    std::string fileName = info.Length() > 1 && info[1].IsString() ? info[1].As<Napi::String>().Utf8Value() : "";

    NatusParseResult res = NatusParser::parseText(std::move(text), fileName);
    return ConvertParseResultToJs(env, res);
}

// Parse Natus file directly
Napi::Value ParseNatusFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "File path string expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    try {
        NatusParseResult res = NatusParser::parseFile(filePath);
        return ConvertParseResultToJs(env, res);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Nearest time point
Napi::Value FindNearestTimePoint(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected timeMs and timeSeries").ThrowAsJavaScriptException();
        return env.Null();
    }
    double timeMs = info[0].As<Napi::Number>().DoubleValue();

    std::vector<double> timeSeries;
    if (info[1].IsTypedArray()) {
        Napi::TypedArray typedArr = info[1].As<Napi::TypedArray>();
        Napi::Float64Array f64 = typedArr.As<Napi::Float64Array>();
        timeSeries.resize(f64.ElementLength());
        for (size_t i = 0; i < f64.ElementLength(); ++i) {
            timeSeries[i] = f64[i];
        }
    } else if (info[1].IsArray()) {
        Napi::Array arr = info[1].As<Napi::Array>();
        timeSeries.resize(arr.Length());
        for (uint32_t i = 0; i < arr.Length(); ++i) {
            timeSeries[i] = arr.Get(i).As<Napi::Number>().DoubleValue();
        }
    } else {
        return env.Null();
    }

    double res = SignalProcessing::findNearestTimePoint(timeMs, timeSeries);
    return Napi::Number::New(env, res);
}

// Generate time series
Napi::Value GenerateTimeSeries(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected subsampledKhz and durationMs").ThrowAsJavaScriptException();
        return env.Null();
    }
    double subsampledKhz = info[0].As<Napi::Number>().DoubleValue();
    double durationMs = info[1].As<Napi::Number>().DoubleValue();

    std::vector<double> ts = SignalProcessing::generateTimeSeries(subsampledKhz, durationMs);
    Napi::Float64Array out = Napi::Float64Array::New(env, ts.size());
    double* pOut = out.Data();
    for (size_t i = 0; i < ts.size(); ++i) {
        pOut[i] = ts[i];
    }
    return out;
}

// Build inverted signal points with timestamps: [{ time, value }, ...]
Napi::Value BuildSignalPoints(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected rawSamples, freqHz, durationMs").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::vector<double> samples;
    if (info[0].IsString()) {
        std::string rawStr = info[0].As<Napi::String>().Utf8Value();
        samples = FastNumberParser::parseSamples(rawStr, 1.0);
    } else if (info[0].IsTypedArray()) {
        Napi::Float64Array f64 = info[0].As<Napi::Float64Array>();
        samples.resize(f64.ElementLength());
        for (size_t i = 0; i < f64.ElementLength(); ++i) samples[i] = f64[i];
    } else if (info[0].IsArray()) {
        Napi::Array arr = info[0].As<Napi::Array>();
        samples.resize(arr.Length());
        for (uint32_t i = 0; i < arr.Length(); ++i) {
            samples[i] = arr.Get(i).As<Napi::Number>().DoubleValue();
        }
    }

    double freqHz = info[1].IsNumber() ? info[1].As<Napi::Number>().DoubleValue() : 0.0;
    double durationMs = info[2].IsNumber() ? info[2].As<Napi::Number>().DoubleValue() : 0.0;

    auto points = SignalProcessing::buildSignalPoints(samples, freqHz, durationMs);

    // Fast JSON batch creation
    std::string json;
    json.reserve(points.size() * 32 + 2);
    json.push_back('[');
    char buf[32];
    for (size_t i = 0; i < points.size(); ++i) {
        if (i > 0) json.push_back(',');
        json += "{\"time\":";
        auto [p1, e1] = std::to_chars(buf, buf + sizeof(buf), points[i].time);
        json.append(buf, p1 - buf);
        json += ",\"value\":";
        auto [p2, e2] = std::to_chars(buf, buf + sizeof(buf), points[i].value);
        json.append(buf, p2 - buf);
        json.push_back('}');
    }
    json.push_back(']');

    Napi::Function jsonParse = env.Global().Get("JSON").As<Napi::Object>().Get("parse").As<Napi::Function>();
    return jsonParse.Call({ Napi::String::New(env, json) });
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("calculateCRC32", Napi::Function::New(env, CalculateCRC32));
    exports.Set("isNatusSignature", Napi::Function::New(env, IsNatusSignature));
    exports.Set("parseNatusText", Napi::Function::New(env, ParseNatusText));
    exports.Set("parseNatusFile", Napi::Function::New(env, ParseNatusFile));
    exports.Set("findNearestTimePoint", Napi::Function::New(env, FindNearestTimePoint));
    exports.Set("generateTimeSeries", Napi::Function::New(env, GenerateTimeSeries));
    exports.Set("buildSignalPoints", Napi::Function::New(env, BuildSignalPoints));
    return exports;
}

NODE_API_MODULE(biosignal_native, Init)
