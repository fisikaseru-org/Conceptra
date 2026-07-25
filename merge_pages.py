import os, re

def get_file_content(path):
    with open(path, 'r') as f:
        return f.read()

domain_intel = get_file_content('frontend/app/domain-intel/page.tsx')
scientometrics = get_file_content('frontend/app/scientometrics/page.tsx')

# Merge imports
imports = set()
for line in domain_intel.split('\n'):
    if line.startswith('import '): imports.add(line)
for line in scientometrics.split('\n'):
    if line.startswith('import '): imports.add(line)

print("Imports to merge:")
for i in imports: print(i)
