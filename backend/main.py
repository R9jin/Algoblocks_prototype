from fastapi import FastAPI, HTTPException # Remove Depends
# from sqlalchemy.orm import Session # DELETE THIS
# from database import get_db # DELETE THIS
# import models # DELETE THIS
import sys
from io import StringIO
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast

app = FastAPI()

# --- CORS SETUP ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodePayload(BaseModel):
    code: str

# --- ADVANCED COMPLEXITY ANALYZER ---
class ComplexityAnalyzer(ast.NodeVisitor):
    def __init__(self, source_code):
        self.source_lines = source_code.splitlines()
        self.details = []       
        self.current_depth = 0  
        self.max_complexity = 0 
        self.has_sort = False
        
        # 🌟 NEW: Dictionary to memorize custom function complexities
        self.custom_functions = {} 
    
    def get_code_snippet(self, node):
        if hasattr(node, 'lineno'):
            line = self.source_lines[node.lineno - 1]
            return line.strip()
        return "Code Block"

    def get_color(self, complexity_str):
        if "n^2" in complexity_str or "n^3" in complexity_str: return "#e74c3c" # RED
        if "log" in complexity_str: return "#2980b9" # BLUE
        if "O(n)" in complexity_str: return "#e67e22" # ORANGE
        return "#27ae60" # GREEN

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

        if power > self.max_complexity:
            self.max_complexity = power

    # --- 🌟 NEW: Analyze Function Definitions ---
    def visit_FunctionDef(self, node):
        # 1. Record the "def name():" line
        self.record_line(node, complexity_override="O(1)")
        
        # 2. Reset max tracker to measure ONLY this function
        previous_max = self.max_complexity
        self.max_complexity = 0
        
        # 3. Analyze everything inside the function
        self.generic_visit(node)
        
        # 4. Save the function's complexity to our memory!
        self.custom_functions[node.name] = self.max_complexity
        
        # 5. Restore the global max complexity
        self.max_complexity = max(previous_max, self.custom_functions[node.name])

    # --- VISITORS ---
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

    def visit_Assign(self, node):
        self.record_line(node)
    
    def visit_AugAssign(self, node):
        self.record_line(node)

    def visit_Expr(self, node):
        if isinstance(node.value, ast.Call):
            # 1. Is it a built-in sort?
            is_sort = False
            if isinstance(node.value.func, ast.Attribute) and node.value.func.attr == 'sort':
                is_sort = True
            elif isinstance(node.value.func, ast.Name) and node.value.func.id == 'sorted':
                is_sort = True

            if is_sort:
                self.has_sort = True
                self.record_line(node, complexity_override="O(n log n)")
                return

            # 🌟 2. NEW: Is it a custom function we memorized?
            if isinstance(node.value.func, ast.Name):
                func_name = node.value.func.id
                if func_name in self.custom_functions:
                    
                    # Fetch its complexity from memory
                    func_power = self.custom_functions[func_name]
                    if func_power == 0: comp_str = "O(1)"
                    elif func_power == 1: comp_str = "O(n)"
                    else: comp_str = f"O(n^{func_power})"
                    
                    # Record the function call with its TRUE complexity
                    self.record_line(node, complexity_override=comp_str)
                    return

        # 3. Normal expression
        self.record_line(node)

    def get_final_badge(self):
        if self.has_sort and self.max_complexity < 2:
            return "O(n log n)"
        
        if self.max_complexity == 0: return "O(1)"
        if self.max_complexity == 1: return "O(n)"
        return f"O(n^{self.max_complexity})"

# --- ENDPOINTS ---

# Update the paths to include /api to match vercel.json
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
    except Exception as e:
        return {"status": "error", "total": "Error", "lines": []}

@app.post("/api/run")
def run_code(payload: CodePayload):
    # 1. Create a buffer to capture 'print' statements
    old_stdout = sys.stdout
    redirected_output = sys.stdout = StringIO()

    try:
        # 2. Execute the code
        exec_globals = {}
        exec(payload.code, exec_globals)
        
        # 3. Get the output
        output = redirected_output.getvalue()
        
        if not output:
            output = "> Code ran successfully (No output printed)."

    except Exception as e:
        output = f"Runtime Error: {str(e)}"
    
    finally:
        # 4. Reset stdout (Very Important!)
        sys.stdout = old_stdout

    return {"status": "success", "output": output}

# @app.post("/api/projects/")
# def create_project(title: str, blocks: dict, db: Session = Depends(get_db)):
#     """
#     Saves a student's algorithm to the database.
#     """
#     # ⚠️ In real life, get 'user_id' from the logged-in token
#     new_project = models.Project(
#         title=title, 
#         data=blocks,  # We dump the raw JSON here
#         owner_id=1    # Hardcoded for prototype
#     )
#     db.add(new_project)
#     db.commit()
#     db.refresh(new_project)
#     return {"status": "success"}

# @app.get("/api/projects/")
# def get_projects(db: Session = Depends(get_db)):
#     return db.query(models.Project).all()