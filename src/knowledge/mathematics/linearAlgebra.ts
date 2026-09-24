import { MathKnowledgeItem } from '../knowledgeTypes';

export const linearAlgebraKnowledge: MathKnowledgeItem[] = [
  {
    id: 'linalg-vectors-dot-cross',
    topic: 'Linear Algebra',
    subtopic: 'Vectors',
    level: 'intermediate',
    concept: 'Vector Operations, Dot Product, and Cross Product',
    definition:
      'Vectors represent quantities with magnitude and direction in Euclidean space. The dot product u . v produces a scalar measuring directional alignment: u . v = |u||v| cos(theta). The cross product u x v produces an orthogonal 3D vector whose magnitude equals the area of the spanned parallelogram: |u x v| = |u||v| sin(theta).',
    notation: '\\mathbf{u} = \\langle u_1, u_2, u_3 \\rangle, \\quad \\mathbf{u} \\cdot \\mathbf{v}, \\quad \\mathbf{u} \\times \\mathbf{v}',
    formulas: [
      '\\mathbf{u} \\cdot \\mathbf{v} = u_1 v_1 + u_2 v_2 + u_3 v_3 = \\|\\mathbf{u}\\| \\|\\mathbf{v}\\| \\cos\\theta',
      '\\|\\mathbf{u}\\| = \\sqrt{u_1^2 + u_2^2 + u_3^2}',
      '\\cos\\theta = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\| \\|\\mathbf{v}\\|}',
      '\\mathbf{u} \\times \\mathbf{v} = \\det \\begin{pmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ u_1 & u_2 & u_3 \\\\ v_1 & v_2 & v_3 \\end{pmatrix} = \\langle u_2 v_3 - u_3 v_2, \\, u_3 v_1 - u_1 v_3, \\, u_1 v_2 - u_2 v_1 \\rangle',
    ],
    assumptions: ['Vectors belong to the same finite dimensional real vector space R^n (cross product is defined in R^3).'],
    domainRestrictions: ['Vectors must be non-zero to define the angle theta.', 'Cross product is strictly anti-commutative: u x v = -(v x u).'],
    theorems: [
      'Orthogonality Condition: Two non-zero vectors u and v are orthogonal if and only if u . v = 0.',
      'Collinearity Condition: Two non-zero vectors in R^3 are parallel if and only if u x v = 0.',
    ],
    examples: [
      {
        problem: 'Calculate the dot product of u = <1, 3> and v = <4, -2>',
        solution: '-2 (vectors are not orthogonal)',
        steps: ['Multiply corresponding components: 1 * 4 = 4, 3 * (-2) = -6', 'Sum components: 4 + (-6) = -2'],
        latex: '\\mathbf{u} \\cdot \\mathbf{v} = (1)(4) + (3)(-2) = 4 - 6 = -2',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming the cross product is commutative: u x v = v x u.',
        correction: 'Cross product is anti-commutative: u x v = -(v x u).',
        why: 'The direction of u x v follows the right-hand rule, which reverses when order of factors is swapped.',
        preventionTip: 'Preserve factor order strictly when computing vector cross products.',
      },
      {
        mistake: 'Confusing dot product (scalar output) with scalar multiplication or cross product (vector output).',
        correction: 'Dot product produces a single scalar number; cross product produces a vector.',
        why: 'Dot product maps V x V -> R.',
        preventionTip: 'Verify whether your required operation expects a scalar or a vector result.',
      },
    ],
    solutionStrategies: [
      'For angle between vectors: compute dot product and vector norms, then theta = arccos((u . v) / (|u||v|)).',
      'For perpendicular direction in 3D: set up the 3x3 determinant with basis vectors i, j, k.',
    ],
    relatedTopics: ['matrices', 'linear-transformations', 'projections', 'physics-work-torque'],
    prerequisiteTopics: ['coordinate-geometry', 'pythagorean-theorem', 'trigonometry'],
    keywords: ['vector', 'dot product', 'cross product', 'orthogonal', 'magnitude', 'norm', 'angle between vectors'],
    aliases: ['vector algebra', 'inner product'],
    latexRepresentation: '\\mathbf{u} \\cdot \\mathbf{v} = \\|\\mathbf{u}\\| \\|\\mathbf{v}\\| \\cos\\theta, \\quad \\mathbf{u} \\times \\mathbf{v} = -(\\mathbf{v} \\times \\mathbf{u})',
    sourceMetadata: {
      sourceName: 'Gibbs & Heaviside Vector Analysis Foundations',
      sourceType: 'standard_mathematical_definition',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'linalg-matrices-determinant-inverse',
    topic: 'Linear Algebra',
    subtopic: 'Matrices and Systems',
    level: 'intermediate',
    concept: 'Matrix Multiplication, Determinant, and Inverses',
    definition:
      'A matrix is a rectangular array of scalars representing linear mappings. Matrix multiplication (AB) requires the number of columns in A to match rows in B. A square matrix A has an inverse A^-1 such that A A^-1 = I if and only if its determinant det(A) != 0.',
    notation: 'A \\in \\mathbb{R}^{m \\times n}, \\quad \\det(A) = |A|, \\quad A^{-1}',
    formulas: [
      '(AB)_{ij} = \\sum_{k=1}^p A_{ik} B_{kj}',
      '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc',
      '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad - bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix} \\quad (ad - bc \\neq 0)',
      'A \\mathbf{x} = \\mathbf{b} \\implies \\mathbf{x} = A^{-1} \\mathbf{b} \\quad (\\text{if } \\det A \\neq 0)',
    ],
    assumptions: ['Matrices must have compatible dimensions for multiplication (m x k with k x n).', 'Inverses require square matrices (n x n).'],
    domainRestrictions: ['Matrix inverse exists if and only if det(A) != 0 (matrix is non-singular/invertible).', 'Matrix multiplication is non-commutative in general: AB != BA.'],
    theorems: [
      'Invertible Matrix Theorem: det(A) != 0 <=> rank(A) = n <=> A is invertible <=> Ax = 0 has only the trivial solution.',
      'Determinant Product Rule: det(AB) = det(A) * det(B).',
    ],
    examples: [
      {
        problem: 'Compute the determinant of [[4, 2], [3, 1]]',
        solution: '-2 (invertible)',
        steps: ['ad - bc = (4 * 1) - (2 * 3)', '= 4 - 6 = -2', 'Since det != 0, the matrix is invertible.'],
        latex: '\\det \\begin{pmatrix} 4 & 2 \\\\ 3 & 1 \\end{pmatrix} = (4)(1) - (2)(3) = 4 - 6 = -2',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming matrix multiplication is commutative: AB = BA.',
        correction: 'AB != BA in general. Dimensions or resulting entries often differ.',
        why: 'Compositions of linear transformations do not commute in general.',
        preventionTip: 'Never commute matrix factors unless they are proven to commute.',
      },
      {
        mistake: 'Attempting to invert a matrix with determinant zero.',
        correction: 'If det(A) = 0, the matrix is singular and has no multiplicative inverse.',
        why: 'Division by det(A) = 0 in the inverse formula is undefined.',
        preventionTip: 'Always evaluate the determinant before attempting matrix inversion.',
      },
    ],
    solutionStrategies: [
      'Check inner dimensions match before multiplying: (m x k) * (k x n) -> (m x n).',
      'For 2x2 inverse: swap main diagonal elements, negate anti-diagonal elements, divide by (ad - bc).',
      'For larger systems, apply Gaussian elimination with row operations.',
    ],
    relatedTopics: ['systems-of-equations', 'eigenvalues-eigenvectors', 'rank-nullity', 'cramers-rule'],
    prerequisiteTopics: ['vectors', 'systems-of-linear-equations'],
    keywords: ['matrix', 'determinant', 'inverse matrix', 'matrix multiplication', 'singular matrix', 'identity matrix'],
    aliases: ['matrix algebra', 'linear systems'],
    latexRepresentation: '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc, \\quad A^{-1} = \\frac{1}{\\det A} \\operatorname{adj}(A)',
    sourceMetadata: {
      sourceName: 'Arthur Cayley Matrix Algebra Foundations',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
