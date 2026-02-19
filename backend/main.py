from fastapi import FastAPI
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
        self.details = []       # The rows for your table
        self.current_depth = 0  # Track nested loops
        self.max_complexity = 0 # Track worst-case O()
        self.has_sort = False
    
    def get_code_snippet(self, node):
        """Grabs the actual text from the source code using line numbers."""
        if hasattr(node, 'lineno'):
            # AST line numbers are 1-based, list is 0-based
            line = self.source_lines[node.lineno - 1]
            return line.strip()
        return "Code Block"

    def get_color(self, complexity_str):
        """Returns the color code for the frontend."""
        if "n^2" in complexity_str or "n^3" in complexity_str:
            return "#e74c3c" # RED (Slow)
        if "log" in complexity_str:
            return "#2980b9" # BLUE (Logarithmic)
        if "O(n)" in complexity_str:
            return "#e67e22" # ORANGE (Linear)
        return "#27ae60"     # GREEN (Fast)

    def record_line(self, node, complexity_override=None):
        """Helper to save a line to the results."""
        # Calculate Complexity
        power = self.current_depth
        if complexity_override:
            comp_str = complexity_override
        elif power == 0:
            comp_str = "O(1)"
        elif power == 1:
            comp_str = "O(n)"
        else:
            comp_str = f"O(n^{power})"

        # Determine Color
        color = self.get_color(comp_str)

        # Add to list
        self.details.append({
            "lineOfCode": self.get_code_snippet(node),
            "complexity": comp_str,
            "indent": self.current_depth,
            "color": color
        })

        # Update Max (for the badge)
        if power > self.max_complexity:
            self.max_complexity = power

    # --- VISITORS (What we analyze) ---

    def visit_For(self, node):
        self.current_depth += 1
        self.record_line(node) # Record the "for" line itself
        self.generic_visit(node) # Go inside the loop
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
    
    def visit_AugAssign(self, node): # Handles +=, -=
        self.record_line(node)

    def visit_Expr(self, node):
        # This handles function calls like print() or list.sort()
        is_sort = False
        
        # Check for .sort()
        if isinstance(node.value, ast.Call):
            if isinstance(node.value.func, ast.Attribute) and node.value.func.attr == 'sort':
                is_sort = True
            elif isinstance(node.value.func, ast.Name) and node.value.func.id == 'sorted':
                is_sort = True

        if is_sort:
            self.has_sort = True
            self.record_line(node, complexity_override="O(n log n)")
        else:
            self.record_line(node)

    def get_final_badge(self):
        # Logic for the "Total Complexity" Badge
        if self.has_sort and self.max_complexity < 2:
            return "O(n log n)"
        
        if self.max_complexity == 0: return "O(1)"
        if self.max_complexity == 1: return "O(n)"
        return f"O(n^{self.max_complexity})"

# --- ENDPOINTS ---

@app.post("/analyze")
def analyze_complexity(payload: CodePayload):
    try:
        tree = ast.parse(payload.code)
        
        # Initialize with source code so we can grab lines
        analyzer = ComplexityAnalyzer(payload.code)
        analyzer.visit(tree)
        
        return {
            "status": "success",
            "total": analyzer.get_final_badge(),
            "lines": analyzer.details
        }

    except Exception as e:
        return {"status": "error", "total": "Error", "lines": []}

@app.post("/run")
def run_code(payload: CodePayload):
    """
    Executes the Python code on the server and captures the output.
    WARNING: usage of 'exec' is dangerous in production, but fine for a local thesis.
    """
    # 1. Create a buffer to capture 'print' statements
    old_stdout = sys.stdout
    redirected_output = sys.stdout = StringIO()

    try:
        # 2. Execute the code safely
        # We create a specific dictionary for global/local variables to keep it clean
        exec_globals = {}
        exec(payload.code, exec_globals)
        
        # 3. Get the output
        output = redirected_output.getvalue()
        
        # If nothing was printed, let the user know it ran successfully
        if not output:
            output = "> Code ran successfully (No output printed)."

    except Exception as e:
        # Capture runtime errors (like Index out of Bounds)
        output = f"Runtime Error: {str(e)}"
    
    finally:
        # 4. Reset stdout (Very Important!)
        sys.stdout = old_stdout

    return {"status": "success", "output": output}