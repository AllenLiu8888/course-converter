# Course Converter

A powerful command-line tool for converting OpenEdx OLX format courses to LiaScript Markdown format.


## Features

- **Batch Conversion**: Supports single `.tar.gz` files or folders containing multiple courses
- **Complete Support**: Converts course structure, content, media files, and interactive problems
- **Problem Types**: Supports multiple choice, single choice, dropdown selection, text input, number input, and hints
- **Media Processing**: Automatically handles images and video files
- **Error Handling**: Robust error handling, individual course failures don't affect other courses
- **Functional Programming**: Uses modern JavaScript functional programming paradigms

## Quick Start

### Installation

```bash
npm install
```

### Basic Usage

```bash
# Convert a single course file
node courseconverter.js input-course.tar.gz output-folder

# Convert a folder containing multiple courses
node courseconverter.js input-folder output-folder

# Show help information
node courseconverter.js --help
```

### Examples

```bash
# Convert a single course
node courseconverter.js input-courses/simple-course.tar.gz output-courses

# Convert multiple courses
node courseconverter.js input-courses/ output-courses/

# Verbose mode (show more information)
node courseconverter.js --verbose input-courses/ output-courses/
```

## Output Structure

Converted courses will be organized in the following structure:

```
output-courses/
├── course1/
│   ├── course.md          # Converted LiaScript Markdown file
│   └── media/             # Media files directory
│       ├── image1.png
│       ├── image2.jpg
│       └── video1.mp4
├── course2/
│   ├── course.md
│   └── media/
└── ...
```

## Supported Problem Types

1. Multiple Choice
2. Single Choice  
3. Dropdown/Selection
4. Text Input
5. Number Input
6. Hints Support
7. CheckBox Support



## Video Support

YouTube Videos

External URL Videos

## Image Processing

Automatically processes image files in courses:

- Converts images from `/static/` paths to `./media/` relative paths
- Automatically copies image files to output directory
- Supports multiple image formats (PNG, JPG, GIF, SVG)

## Testing

Run the test suite:

```bash
# Run all tests
npm test
```

## Project Structure

```
my-course-converter/
├── courseconverter.js      # Main program file
├── package.json            # Project configuration
├── jest.config.js          # Jest test configuration
├── tests/                  # Test files
│   ├── core-requirements.test.js
│   └── ...
├── input-courses/          # Input course files
├── output-courses/         # Output course files
└── temp/                   # Temporary files directory
```

## Technology Stack

- **Node.js**: Runtime environment
- **ES Modules**: JavaScript module system
- **Commander.js**: Command-line argument parsing
- **fast-xml-parser**: XML parsing
- **node-html-markdown**: HTML to Markdown conversion
- **tar**: Compressed file processing
- **Jest**: Testing framework

## Error Handling

- Individual course conversion failures don't affect other courses
- Detailed error information and stack traces (verbose mode)
- Graceful degradation for unsupported content types
- Automatic cleanup of temporary files



## AI-Assisted Development Statement

This project was developed with assistance from the following AI tools:

- **ChatGPT**: Helped with code logic organization and architectural design
- **Cursor**: Assisted with README documentation writing and partial code debugging
- **Claude Code**: Assisted with Jest testing documentation and Jest teaching guidance

These AI tools provided valuable guidance and code assistance during development, but all final code implementation, architectural decisions, and functional design were completed independently by the developer.


## Author

Yikai Liu