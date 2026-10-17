#include "signal_processing.hpp"
#include <algorithm>
#include <cmath>

namespace biosignal {

double SignalProcessing::findNearestTimePoint(double timeMs, const std::vector<double>& timeSeries) {
    if (timeSeries.empty()) return 0.0;
    if (timeSeries.size() == 1) return round3(timeSeries[0]);

    size_t left = 0;
    size_t right = timeSeries.size() - 1;
    while (left < right) {
        size_t mid = left + (right - left) / 2;
        if (timeSeries[mid] < timeMs) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    double result;
    if (left > 0) {
        double distLeft = std::abs(timeSeries[left - 1] - timeMs);
        double distRight = std::abs(timeSeries[left] - timeMs);
        result = (distLeft <= distRight) ? timeSeries[left - 1] : timeSeries[left];
    } else {
        result = timeSeries[left];
    }

    return round3(result);
}

std::vector<double> SignalProcessing::generateTimeSeries(double subsampledKhz, double durationMs) {
    std::vector<double> timeSeries;
    if (subsampledKhz <= 0.0 || durationMs < 0.0) return timeSeries;

    double samplingRateHz = subsampledKhz * 1000.0;
    double intervalMs = 1000.0 / samplingRateHz;

    size_t estimatedCount = static_cast<size_t>(durationMs / intervalMs) + 2;
    timeSeries.reserve(estimatedCount);

    double currentTime = 0.0;
    while (currentTime <= durationMs + 1e-9) {
        timeSeries.push_back(round3(currentTime));
        currentTime += intervalMs;
    }
    return timeSeries;
}

std::vector<SignalPoint> SignalProcessing::buildSignalPoints(const std::vector<double>& samples,
                                                            double freqHz,
                                                            double durationMs) {
    std::vector<SignalPoint> points;
    if (samples.empty()) return points;

    double dtMs = 1.0;
    if (freqHz > 0.0) {
        dtMs = 1000.0 / freqHz;
    } else if (durationMs > 0.0 && samples.size() > 0) {
        dtMs = durationMs / static_cast<double>(samples.size());
    }

    points.resize(samples.size());
    for (size_t i = 0; i < samples.size(); ++i) {
        points[i].time = round3(static_cast<double>(i) * dtMs);
        points[i].value = -samples[i]; 
    }
    return points;
}

} // namespace biosignal
