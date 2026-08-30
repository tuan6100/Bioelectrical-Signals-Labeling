#pragma once
#include <string>
#include <cstdint>
#include <cstddef>

namespace biosignal {

class Crc32 {
public:
    static uint32_t calculate(const uint8_t* data, size_t length, uint32_t seed = 0);
    static uint32_t calculate(const std::string& str);
    static std::string toHexString(uint32_t crc);
};

} // namespace biosignal
