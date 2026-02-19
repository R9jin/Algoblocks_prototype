from fastapi import FastAPI, HTTPException
import sys
from io import StringIO
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodePayload(BaseModel):
    code: str

class ComplexityAnalyzer(ast.NodeVisitor):
    def __init__(self, source_code):
        self.source_lines = source_code.splitlines()
        self.details = []       
        self.current_depth = 0  
        self.max_complexity = 0 
        self.has_sort = False
        self.custom_functions = {} 
        self.current_function_name = None  # 🔥 FIX: Prevents AttributeError

    def get_code_snippet(self, node):
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]
            return line.strip()
        return "Code Block"

    def get_color(self, complexity_str):
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c"
        if "log" in complexity_str: return "#2980b9"
        if "O(n)" in complexity_str: return "#e67e22"
        return "#27ae60"

    def record_line(self, node, complexity_override=None):
        power = self.current_depth
        if complexity_override:
            comp_str = complexity_override
        elif power == 0: comp_str = "O(1)"
        elif power == 1: comp_str = "O(n)"
        else: comp_str = f"O(n^{power})"

        color = self.get_color(comp_str)

        self.details.append({
            "lineOfCode": self.get_code_snippet(node),
            "complexity": comp_str,
            "indent": self.current_depth,
            "color": color
        })

        if not complexity_override and power > self.max_complexity:
            self.max_complexity = power

    def visit_FunctionDef(self, node):
        self.current_function_name = node.name 
        self.record_line(node, complexity_override="O(1)")
        
        previous_max = self.max_complexity
        self.max_complexity = 0
        self.generic_visit(node)
        
        func_max_power = self.max_complexity 

        body_str = ast.dump(node)
        is_recursive = f"id='{node.name}'" in body_str
        
        if is_recursive and "merge" in node.name:
            self.custom_functions[node.name] = "O(n log n)"
        else:
            if func_max_power == 0: 
                comp_str = "O(1)"
            elif func_max_power == 1: 
                comp_str = "O(n)"
            else: 
                comp_str = f"O(n^{func_max_power})"
            
            self.custom_functions[node.name] = comp_str
        
        self.max_complexity = max(previous_max, func_max_power)
        self.current_function_name = None # 🔥 FIX: Reset after method ends

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            
            if func_name == self.current_function_name:
                if "merge_sort" in func_name:
                    self.record_line(node, complexity_override="O(n log n)")
                    return
            
            if func_name in self.custom_functions:
                self.record_line(node, complexity_override=self.custom_functions[func_name])
                return

        self.generic_visit(node)

    def visit_For(self, node):
        self.current_depth += 1
        self.record_line(node) 
        self.generic_visit(node) 
        self.current_depth -= 1

    def visit_While(self, node):
        self.current_depth += 1
        self.record_line(node)
        self.generic_visit(node)
        self.current_depth -= 1

    def visit_If(self, node):
        self.record_line(node)
        self.generic_visit(node)

    def visit_Expr(self, node):
        if isinstance(node.value, ast.Call):
            if isinstance(node.value.func, ast.Name):
                func_name = node.value.func.id
                if func_name in self.custom_functions:
                    self.record_line(node, complexity_override=self.custom_functions[func_name])
                    return
        self.record_line(node)

    def get_final_badge(self):
        if any("O(n log n)" in str(d.get('complexity')) for d in self.details):
            return "O(n log n)"
        if self.max_complexity == 0: return "O(1)"
        if self.max_complexity == 1: return "O(n)"
        return f"O(n^{self.max_complexity})"

@app.post("/api/analyze")
def analyze_complexity(payload: CodePayload):
    try:
        tree = ast.parse(payload.code)
        analyzer = ComplexityAnalyzer(payload.code)
        analyzer.visit(tree)
        return {
            "status": "success",
            "total": analyzer.get_final_badge(),
            "lines": analyzer.details
        }
    except Exception:
        return {"status": "error", "total": "Error", "lines": []}

@app.post("/api/run")
def run_code(payload: CodePayload):
    old_stdout = sys.stdout
    redirected_output = sys.stdout = StringIO()
    try:
        exec_globals = {}
        exec(payload.code, exec_globals)
        output = redirected_output.getvalue()
        if not output:
            output = "> Code ran successfully."
    except Exception as e:
        output = f"Runtime Error: {str(e)}"
    finally:
        sys.stdout = old_stdout
    return {"status": "success", "output": output}