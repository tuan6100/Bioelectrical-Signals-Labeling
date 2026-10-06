#pragma once
#include <string>
#include <vector>

namespace biosignal {

struct ChannelData {
    int channelNumber = 1;
    std::string dataType;
    std::vector<double> samples;
    double samplingFrequencyKhz = 0.0;
    double subsampledKhz = 0.0;
    double durationMs = 0.0;
};

struct NatusMetadata {
    std::string patientId;
    std::string firstName;
    std::string gender = "F";
    std::string measurementType = "UNKNOWN";
    std::string startTime;
    std::string endTime;
};

struct NatusParseResult {
    bool isNatus = false;
    std::string contentHash;
    NatusMetadata metadata;
    std::vector<ChannelData> channels;
};

struct SignalPoint {
    double time = 0.0;
    double value = 0.0;
};

} // namespace biosignal
