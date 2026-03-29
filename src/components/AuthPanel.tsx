import React, { useState } from 'react';
import './AuthPanel.css';

const AuthPanel = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validatePassword = (pass) => {
    // Password strength validation logic here
    const strength = getPasswordStrength(pass);
    setIsValid(strength.isValid);
    setError(strength.message);
  };

  const getPasswordStrength = (pass) => {
    // Example logic for password strength
    let message = 'Weak';
    let isValid = false;
    if (pass.length >= 8) {
      message = 'Medium';
      isValid = true;
    }
    if (pass.match(/[A-Z]/) && pass.match(/[0-9]/)) {
      message = 'Strong';
      isValid = true;
    }
    return { message, isValid };
  };

  return (
    <div className="auth-panel">
      <h2>Login</h2>
      <input
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          validatePassword(e.target.value);
        }}
        className={`password-input ${isValid ? 'valid' : 'invalid'}`}
        placeholder="Enter your password"
      />
      <div className="password-strength"><span>{error}</span></div>
      <button className="submit-button">Submit</button>
    </div>
  );
};

export default AuthPanel;