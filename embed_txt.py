import base64
import json

# Read all txt files and encode them
files_to_encode = {
    'beginner': 'txt/beginner.txt',
    'elementary': 'txt/elementary.txt',
    'preintermediate': 'txt/preintermediate.txt',
    'intermediate': 'txt/intermediate.txt',
    'ieltsfoundation': 'txt/ieltsfoundation.txt',
    'ieltspractice': 'txt/ieltspractice.txt'
}

encoded_data = {}

for key, filepath in files_to_encode.items():
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            encoded_data[key] = base64.b64encode(content.encode('utf-8')).decode('utf-8')
            print(f"Encoded {key}: {len(content)} characters")
    except FileNotFoundError:
        print(f"File not found: {filepath}")

# Generate the JavaScript object
js_object = "const testData = {\n"
for key, encoded in encoded_data.items():
    js_object += f"  {key}: atob('{encoded}'),\n"
js_object += "};"

# Save the JavaScript object to a file
with open('embedded_data.js', 'w', encoding='utf-8') as f:
    f.write(js_object)

print("\nGenerated embedded_data.js with all test content encoded!")
print("Copy this into your test-core.js file.")
