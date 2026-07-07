import sys

# Set a large limit for integer string conversion to handle up to 10000+ digits
sys.set_int_max_str_digits(50000)

def solve(a_str: str, b_str: str, m_str: str) -> int:
    """
    Computes (A^B) % M for very large numbers A, B, and M.
    A, B, and M are provided as strings.
    """
    try:
        a = int(a_str.strip())
        b = int(b_str.strip())
        m = int(m_str.strip())
    except ValueError as e:
        raise ValueError("Invalid input: A, B, and M must be valid integers.") from e

    if m <= 0:
        raise ValueError("Modulo M must be a positive integer.")

    if m == 1:
        return 0

    # pow(base, exp, mod) is highly optimized in Python
    # For large exponents (up to 10,000 digits), it uses binary exponentiation
    return pow(a, b, m)

def main():
    # Read A, B, M from standard input
    # Expected input format:
    # Line 1: A
    # Line 2: B
    # Line 3: M
    try:
        lines = sys.stdin.read().split()
        if not lines:
            return
        if len(lines) < 3:
            print("Error: Expected 3 inputs (A, B, M)", file=sys.stderr)
            sys.exit(1)
        a_str, b_str, m_str = lines[0], lines[1], lines[2]
        result = solve(a_str, b_str, m_str)
        print(result)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
