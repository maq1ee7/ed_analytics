%%{init: {'flowchart': {'curve': 'linear'}}}%%
graph TD;
	__start__([<p>__start__</p>]):::first
	selectStatform(selectStatform)
	selectSection(selectSection)
	selectViewCells(selectViewCells)
	generateDashboard(generateDashboard)
	__end__([<p>__end__</p>]):::last
	__start__ --> selectStatform;
	generateDashboard --> __end__;
	selectStatform -.-> selectSection;
	selectStatform -.-> selectViewCells;
	selectStatform -.-> generateDashboard;
	selectStatform -.-> __end__;
	selectSection -.-> selectStatform;
	selectSection -.-> selectViewCells;
	selectSection -.-> generateDashboard;
	selectSection -.-> __end__;
	selectViewCells -.-> selectStatform;
	selectViewCells -.-> selectSection;
	selectViewCells -.-> generateDashboard;
	selectViewCells -.-> __end__;
	classDef selectStatform #E3F2FD;
	classDef selectSection #E8F5E9;
	classDef selectViewCells #FFF3E0;
	classDef generateDashboard #F3E5F5;
