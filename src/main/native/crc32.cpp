#include "crc32.hpp"
#include <array>
#include <iomanip>
#include <sstream>

namespace biosignal {

namespace {

constexpr std::array<uint32_t, 256> generateTable() {
    std::array<uint32_t, 256> table{};
    for (uint32_t i = 0; i < 256; ++i) {
        uint32_t c = i;
        for (int k = 0; k < 8; ++k) {
            if (c & 1) {
                c = 0xEDB88320u ^ (c >> 1);
            } else {
                c = c >> 1;
            }
        }
        table[i] = c;
    }
    return table;
}

constexpr auto CRC_TABLE = generateTable();

} // namespace

uint32_t Crc32::calculate(const uint8_t* data, size_t length, uint32_t seed) {
    uint32_t c = ~seed;
    for (size_t i = 0; i < length; ++i) {
        c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >> 8);
    }
    return ~c;
}

uint32_t Crc32::calculate(const std::string& str) {
    return calculate(reinterpret_cast<const uint8_t*>(str.data()), str.size());
}

std::string Crc32::toHexString(uint32_t crc) {
    char buf[9];
    snprintf(buf, sizeof(buf), "%08x", crc);
    return std::string(buf);
}

} // namespace biosignal
