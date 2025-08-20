COMP2140 Web/Mobile Programming is protected and may not be shared, uploaded, or distributed. 

© The University of Queensland 2025 
Version 1.0 Last Updated 29 Jul 2025 

1 
 

JS Functional Programming (25% Weighting) - Rubric  

ID Feature Description Max Grade = 100 

1 Attention to Detail 15 marks 

1.1 The app runs via Node.js in the terminal, without any issues. All dependencies are included in package.json. 2.5 

1.2 The project folder contains subfolders according to the specification. 2.5 

1.3 The Planning Document details all expected functionality according to the specification. 10 

2.  Core Functionality 40 marks 

2.1 Able to convert the single Simple and Intermediate OLX course to a LiaScript Markdown course including all content 
types detailed in the specification. Note marks will be deducted for not supporting content types [i.e -3 for each content 
type not supported and -4 for a Problem not supported (e.g. MCQ, Checkboxes, Dropdowns, Text and Numerical 
Input, and Hints]. Deductions will be capped at the max mark of 20. 

20 

2.2 Able to batch convert multiple OLX courses (with increasing content size) in a folder to a LiaScript Markdown courses.  20 

3 Code Style, Error Handling and Testing (Note: Max Grade will be capped at 10 grade points if less than 20/40 
marks are received for 2. Core Functionality) 

20 marks 

3.1 Demonstrates a clear and consistent program structure with well-named variables and functions that follow a 
consistent style. 

2.5 

3.2 Includes meaningful JSDoc comments above functions, using @param and @returns to show understanding of code 
behavior. 

2.5 

3.3 Demonstrates strong ability to write comprehensive test cases using Jest. 10 
COMP2140 Web/Mobile Programming is protected and may not be shared, uploaded, or distributed. 

© The University of Queensland 2025 
Version 1.0 Last Updated 29 Jul 2025 

2 
 

3.4 Demonstrates robust error handling with clear, user-friendly messages and graceful fallbacks for common failures 
(e.g., missing files, malformed xml input). An error in format for a course should not affect other courses from being 
processed. 

5 

4  Functional Programming Paradigm (Note: Max Grade will be capped at 10 grade points if less than 20/40 marks are 
received for 2. Core Functionality) 

25 marks 

4.1 Demonstrates a strong understanding of functional programming techniques, 
balancing the use of declarative & imperative logic and recursive & iterative logic where appropriate and managing 
side effects. 

10 

4.2 Demonstrates a strong understanding of declaring, defining & transforming immutable data. 5 

4.3 Demonstrates clean, modular design with clear separation of concerns; new content handlers can be easily added 
without modifying core logic. 

10 
