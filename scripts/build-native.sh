#!/usr/bin/env bash
# Compiles the snap-vision CoreML helper with whichever Swift toolchain is
# installed. Command Line Tools ship SDKs newer than their own compiler, so
# fall back from the default SDK to the newest one the compiler accepts.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p build-native
sources=(native/snap-vision/*.swift)
sdks=("${SDKROOT:-}" /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk)
for sdk in "${sdks[@]}"; do
  if [ -z "$sdk" ] || [ -d "$sdk" ]; then
    if SDKROOT="$sdk" swiftc -O -o build-native/snap-vision "${sources[@]}" 2>/tmp/snap-build-native.log; then
      exit 0
    fi
  fi
done
cat /tmp/snap-build-native.log >&2
exit 1
