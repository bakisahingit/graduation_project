
import os

file_path = r'd:\OneDrive\Masaüstü\admetgpt-codes\frontend\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_tools_section = False
tools_btn_indent = ""

# Locate the chat tools button index
tools_btn_idx = -1
for i, line in enumerate(lines):
    if 'id="chat-tools-btn"' in line and '<button' in line:
        tools_btn_idx = i
        # Capture indentation
        tools_btn_indent = line[:line.find('<')]
        break

if tools_btn_idx == -1:
    print("Chat tools button not found!")
    exit(1)

# Check if already wrapped
if 'class="tools-wrapper"' in lines[tools_btn_idx-1]:
    print("Already wrapped!")
    exit(0)

# Find the end of the dropdown
# The dropdown starts after the button.
# The button is one line (or multiple). The dropdown is <div id="chat-tools-dropdown">...</div>
# We need to find where the dropdown div closes.
dropdown_start_idx = -1
for i in range(tools_btn_idx, len(lines)):
    if 'id="chat-tools-dropdown"' in lines[i]:
        dropdown_start_idx = i
        break

if dropdown_start_idx == -1:
    print("Dropdown start not found!")
    exit(1)

# Simple heuristic to find the closing div of the dropdown.
# Counting divs from dropdown start.
div_depth = 0
dropdown_end_idx = -1

for i in range(dropdown_start_idx, len(lines)):
    line = lines[i]
    div_depth += line.count('<div')
    div_depth -= line.count('</div')
    
    if div_depth == 0:
        dropdown_end_idx = i
        break

if dropdown_end_idx == -1:
    print("Dropdown end not found!")
    exit(1)

print(f"Wrapping lines {tools_btn_idx} to {dropdown_end_idx}")

# Construct new content
for i in range(len(lines)):
    if i == tools_btn_idx:
        new_lines.append(f'{tools_btn_indent}<div class="tools-wrapper" style="position: relative; display: inline-block;">\n')
    
    new_lines.append(lines[i])
    
    if i == dropdown_end_idx:
        new_lines.append(f'{tools_btn_indent}</div>\n')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully wrapped chat tools button.")
