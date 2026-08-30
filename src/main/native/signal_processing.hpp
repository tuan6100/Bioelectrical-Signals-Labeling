#pragma once
#include "natus_types.hpp"
#include <vector>
#include <cmath>

namespace biosignal {

class SignalProcessing {
public:
    static double findNearestTimePoint(double timeMs, const std::vector<double>& timeSeries);
    static std::vector<double> generateTimeSeries(double subsampledKhz, double durationMs);
    static std::vector<SignalPoint> buildSignalPoints(const std::vector<double>& samples,
                                                      double freqHz,
                                                      double durationMs);
    static double round3(double val) {
        return std::round(val * 1000.0) / 1000.0;
    }
};

} // namespace biosignal
