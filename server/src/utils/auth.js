import jwt from "jsonwebtoken";

// Use a hardcoded secret for hackathon if not provided
const JWT_SECRET = process.env.JWT_SECRET || "tradeledger_hackathon_super_secret_jwt_key_2026";
const JWT_EXPIRES_IN = "7d"; // 7 days

/**
 * Generate a JWT for a given merchantId
 */
export function generateToken(merchantId) {
  return jwt.sign({ merchantId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Express middleware to authenticate JWT and inject merchantId into req
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
    
    // Inject the decoded merchantId into the request object
    req.merchantId = decoded.merchantId;
    next();
  });
}
