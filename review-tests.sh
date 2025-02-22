#!/bin/bash
echo "Test Files Analysis:"
echo "==================="

if [ -d "_tests_" ]; then
    echo "Found test files:"
    find _tests_ -type f -name "*.test.*" -o -name "*.spec.*" | while read -r file; do
        echo "- $file"
        head -n 5 "$file"
        echo "---"
    done
else
    echo "No _tests_ directory found"
fi
