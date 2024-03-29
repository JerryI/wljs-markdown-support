BeginPackage["JerryI`WolframJSFrontend`MarkdownSupport`"];

Begin["Private`"];

MarkdownQ[str_] := Length[StringCases[StringSplit[str, "\n"] // First, RegularExpression["^\\.md$"]]] > 0;

MarkdownProcessor[expr_String, signature_String, parent_, callback_] := Module[{str = StringDrop[expr, StringLength[First[StringSplit[expr, "\n"]]] ]},
  Print["MarkdownProcessor!"];
  JerryI`WolframJSFrontend`Notebook`Notebooks[signature]["kernel"][JerryI`WolframJSFrontend`Evaluator`TemplateEvaluator[str, signature, "markdown", parent], callback, "Link"->"WSTP"];
];

JerryI`WolframJSFrontend`Notebook`NotebookAddEvaluator[(MarkdownQ ->  <|"SyntaxChecker"->(True&),               "Epilog"->(#&),             "Prolog"->(#&), "Evaluator"->MarkdownProcessor  |>), "HighestPriority"];

End[];

EndPackage[];