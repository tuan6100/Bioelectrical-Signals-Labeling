#pragma once
#include "natus_types.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <map>

namespace biosignal {

struct SectionNode {
    std::string path;
    std::string name;
    std::unordered_map<std::string, std::string> keyValues;
    std::vector<SectionNode> children;
};

class NatusParser {
public:
    static bool isNatusSignature(const std::string& text);
    static std::string readUtf16leFile(const std::string& filePath);
    static NatusParseResult parseFile(const std::string& filePath);
    static NatusParseResult parseText(std::string text, const std::string& fileName = "");

private:
    static std::string toLower(std::string_view s);
    static std::string trim(std::string_view s);
    static double deriveScale(std::string_view matchedKey,
                              const std::unordered_map<std::string, std::string>& dataObj,
                              const std::unordered_map<std::string, std::string>& containerObj);
    static double getUnitScale(const std::unordered_map<std::string, std::string>& obj);
};

} // namespace biosignal
