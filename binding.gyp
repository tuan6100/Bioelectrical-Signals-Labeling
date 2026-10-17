{
  "targets": [
    {
      "target_name": "biosignal_native",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "src/main/native/addon.cpp",
        "src/main/native/crc32.cpp",
        "src/main/native/natus_parser.cpp",
        "src/main/native/signal_processing.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [ "/std:c++20" ]
        }
      }
    }
  ]
}
