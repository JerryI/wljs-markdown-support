BeginPackage["Notebook`Editor`Markdown`", {
    "CodeParser`", 
    "JerryI`Notebook`", 
    "JerryI`Notebook`Evaluator`", 
    "JerryI`Notebook`Kernel`", 
    "JerryI`Notebook`Transactions`",
    "JerryI`Misc`Events`"
}]

Begin["`Internal`"]

MarkdownQ[t_Transaction] := (Echo[t["Data"]]; Echo[StringMatchQ[t["Data"], ".md\n"~~___]]; StringMatchQ[t["Data"], ".md"~~___] )

evaluator  = StandardEvaluator["Name" -> "Markdown Evaluator", "Pattern"-> (_?MarkdownQ), "InitKernel" -> init, "Priority"->(1)];

    StandardEvaluator`ReadyQ[evaluator, k_] := (
        True
    );

    StandardEvaluator`Evaluate[evaluator, k_, t_] := Module[{list},
        EventFire[t, "Result", <|"Data"->StringDrop[t["Data"], 4], "Meta"->Sequence["Display"->"markdown"]|>];
        EventFire[t, "Finished", True];
    ];      


init[k_] := Module[{},
    Print["nothing to do..."];
]


End[]
EndPackage[]