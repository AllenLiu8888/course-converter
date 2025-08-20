COMP2140/7240 Web/Mobile Programming 

© The University of Queensland 2025 1 

JavaScript Functional Programming Assessment (25%)  
Project Title: Batch Course Conversion Tool 

Educational institutions often rely on course authoring tools to create and deliver digital learning 
experiences. However, each platform typically stores course content in its own unique format. This 
creates a major challenge when institutions need to migrate their content from one system to 
another, a task often requiring significant time, effort, testing and cost. 

In this assessment, you will develop a Batch Course Conversion Tool using Functional 
JavaScript Programming techniques. Your task is to build a command-line tool that can batch 
convert courses between two widely used formats. Your converter tool will need to convert from 
OpenEdx OLX (an XML-based export format) to LiaScript (a Markdown-based, open education 
format). 

This is a highly authentic and industry-relevant task. Educational providers and organisations 
using content management systems regularly face the need to migrate large volumes of course 
content. The ability to create reliable and extensible migration tools is a rare and valuable skill that 
will set you apart as a developer. 

Through this project, you will deepen your understanding of working with structured data, text 
transformation, and solving problems using functional programming techniques.  

Course Formats 

This assessment focuses on converting between two widely used course formats: OpenEdx OLX 
and LiaScript Markdown. 

OpenEdx is an open-source learning platform originally developed to support MOOCs for the edX 
initiative. It is now used by a wide range of institutions around the world. At The University of 
Queensland (UQ), for example, the platform is branded as UQ Extend and is used to deliver key 
learning modules, such as the compulsory Academic Integrity course taken by all students. 

OpenEdx courses can be exported in a structured format known as OLX (Open Learning XML). 
These exports are packaged as .tar.gz archives and contain the course content and structure in a 
nested XML format.  

Your conversion tool will take a folder of .tar.gz OLX course exports as input. It will unpack 
each archive, extract the XML course structure, and then generate a new version of the course in 
the LiaScript Markdown format. 

LiaScript is an innovative open education technology that turns Markdown files into fully 
interactive online courses. It features a navigable sidebar, embedded multimedia support, and 
powerful learning components, all authored using only a text file with Markdown. More information 
on LiaScript. LiaScript extends standard Markdown with special syntax to support: Headings and 
structure for course navigation and inline Quiz questions, including multiple-choice questions 
(MCQs).Your output should be a valid LiaScript course. Each converted course should be saved 
in its own subfolder.  

https://docs.openedx.org/en/latest/educators/navigation/olx.html
https://liascript.github.io/course/?https://raw.githubusercontent.com/liaScript/docs/master/README.md#1
COMP2140/7240 Web/Mobile Programming 

© The University of Queensland 2025 2 

Specification 

1. You will be given two sample courses in the OpenEdx OLX format: 
o A Simple course that contains labelled contents for each feature that your 

converter must support. 
o An Intermediate course that has real course content with inline quiz 

questions. 

These .tar.gz files will be placed in a folder named inputcourses. Your tool should 
extract them into extractedinputcourses (optional). The converted output should be 
saved in the outputcourses folder with a subfolder created for each course named 
after the course code. The course code is found in the course.xml file in the course 
attribute. The LiaScript course is all contained in a single markdown file called 
course.md.  

Note: During marking, your tool will be tested with additional unseen OLX courses. 

2. Your conversion script must be called courseconverter.js and should: 
 

o Accept either a single .tar.gz file or an input folder containing multiple courses. 
o Accept the output folder name as a parameter. 
o Create a subfolder for each course in the output directory. 
o In each course subfolder (that is named using the course code): 

§ Save the converted content into a file named course.md 
§ Include a media subfolder containing any linked images or videos. 

Example usages: 

node courseconverter.js inputcourses/simple.tar.gz outputcourses 
node courseconverter.js inputcourses/ outputcourses 

3. You should use open-source JavaScript libraries to assist with: 

o Extracting .tar.gz files (tar is recommended) 
o Parsing XML files (fast-xml-parser is recommended) 
o Converting HTML to Markdown (node-html-markdown is recommended) 

You will need to research and choose the libraries to use. 

4. You must not use any libraries that perform OLX-to-anything conversion or 
directly convert OpenEdx content to LiaScript. If uncertain, please ask on the Ed 
Forum. 
 

5. The ability to Preview LiaScript Courses will greatly assist you. You can use the 
following tools:  
 

o LiaScript LiveEditor: https://liascript.github.io/LiveEditor/ 
o LiaScript VSCode Extensions (Preview and Snippets): 

https://liascript.github.io/blog/install-visual-studio-code-with-liascript/ 

https://liascript.github.io/LiveEditor/
https://liascript.github.io/blog/install-visual-studio-code-with-liascript/
COMP2140/7240 Web/Mobile Programming 

© The University of Queensland 2025 3 

6. Your course conversion must support the following content mappings: 

OpenEdx 
Content Type LiaScript Markdown Output 

Course Title # Level 1 Heading 

Chapter Title ## Level 2 Heading 

Sequential 
Title ### Level 3 Heading 

Verticals No direct mapping; all child content must be placed within the associated 
Level 3 section. Think of verticals as containers. 

HTML 
Convert to Markdown. Replace <h1>–<h3> with **bold**. Image paths 
must be updated to point to the media/ folder and the actual files moved 
there. 

Video Use LiaScript’s video embedding markdown. Only YouTube links are 
used. 

Course About Include under an ## About section and convert the HTML to Markdown. 

Problems 

Convert to LiaScript inline question format (e.g. MCQs, inputs). Use the 
Simple course Problem examples (MCQ, Checkboxes, Dropdowns, Text 
and Numeric input & hint examples) as a guide. Try to support the 
Problems with hints in LiaScript if the Markdown format supports it (This 
is for you to investigate and work out). OLX supports problems being 
written in its own Markdown format – however you don’t need to support 
this specific Markdown format and your code will only be tested using the 
XML format. 

Other content 
types 

These don’t need to be supported. Insert a placeholder such as:  
> **Unsupported content: ComponentName component omitted**. 

Unpublished 
Content 

In OpenEdx OLX, content can be created but not published (made live). 
You should not include content that is not published in converted course.  

All other settings and course configuration does not need to be converted to the 
LiaScript markdown format as it may not be supported. 

7. You will need to write Testcases in Jest for ensuring that the conversion works for 
all Content Types.  
COMP2140/7240 Web/Mobile Programming 

© The University of Queensland 2025 4 

8. Your app must implement robust error handling e.g. if a course export is invalid or 
contains malformed XML. Errors must be written to the console. 
 

9. Include a planning document (Word Doc or PDF) to detail your approach to 
understand the OLX export files, the LiaScript markdown being ported to and your 
solution to convert the content. The planning document can include text 
descriptions, pseudocode or flowcharts (or even hand drawn scans). 
 

10. Include a Readme.md file that describes your app and includes details for running 
the code and the Testcases. In the Readme.md also reference your use of AI to 
assist with coding.  
 

11. Ensure that your solution follows the functional programming paradigm and is 
extensible in how it handles content types?  

How to Approach this Assessment Task? 
A few tips to help you get started are below: 

1. Extract the Simple course file and review how Chapters, Sequentials and Verticals 
link together and are stored in folders.  

2. Then analyse content types such as HTML, Videos and Problems (e.g MCQ) and 
see how they are represented in XML.  

3. Re-create the Simple course in LiaScript Markdown manually. This will give you a 
good understanding of the Markdown syntax and help you when you convert from 
XML to the Markdown format. 

4. Plan out the design of your solution. Remember to use functional programming 
concepts and not imperative programming concepts. Your planning document will 
also need to be submitted. This assessment is challenging and designed to both 
test and build your problem solving skills. It is up to you to use functional 
programming techniques to come up with a solution to convert the course to the 
LiaScript format. 

Getting Help 

A Getting Started Guide will also be presented at Lecture 2. Please refer back to the 
Blackboard Ultra Site for the FAQ which will be updated to share responses to common 
student questions. Please also ask questions via the Ed Forum. 
 
If you need additional assistance, please email the Course Coordinator 
(a.bakharia1@uq.edu.au). 
 
Code Submission 
You must submit a single zip file named 
's1234567_Firstname_Lastname_FunctionalJS.zip' (replace with your student number) 
that includes your source code folder(s) and a Readme.md detailing where you used 
GenAI.   

mailto:a.bakharia1@uq.edu.au
COMP2140/7240 Web/Mobile Programming 

© The University of Queensland 2025 5 

A Message About Plagiarism: 

⚠ Plagiarism is considered a serious offence at UQ. Failure to declare the distinction 
between your work and the work of others will result in academic misconduct proceedings. 

• The use of Generative AI (i.e. OpenAI ChatGPT, Anthropic Claude Sonnet, Google 
Gemini, Microsoft Bing Chat, Github Copilot or Cursor, Claude Code, etc) is allowed 
for this assessment item to assist you in designing your web application and 
learning new concepts. However, treat what you’re producing here as a “trade 
secret” and don't share your code with other students. Also include details of where 
Generative AI has been used in a Readme.md file or withing your code comments. 

• If you’re inspired by design or code from online tutorials or any other external 
source, ensure you reference any inspirations for academic purposes (using 
APA/IEEE referencing styles) in an Readme.md file.  
