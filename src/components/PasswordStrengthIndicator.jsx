// src/components/PasswordStrengthIndicator.jsx
import { useState, useEffect } from 'react';
import { validatePasswordStrength } from '../utils/security';

export default function PasswordStrengthIndicator({ password, onValidation }) {
  const [validation, setValidation] = useState({ isValid: false, errors: [], strength: 'weak' });

  useEffect(() => {
    if (password) {
      const result = validatePasswordStrength(password);
      setValidation(result);
      if (onValidation) onValidation(result);
    } else {
      setValidation({ isValid: false, errors: [], strength: 'weak' });
      if (onValidation) onValidation({ isValid: false, errors: [], strength: 'weak' });
    }
  }, [password, onValidation]);

  if (!password) return null;

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthText = (strength) => {
    switch (strength) {
      case 'weak': return 'อ่อน';
      case 'medium': return 'ปานกลาง';
      case 'strong': return 'แข็งแกร่ง';
      default: return '';
    }
  };

  const getStrengthWidth = (strength) => {
    switch (strength) {
      case 'weak': return 'w-1/3';
      case 'medium': return 'w-2/3';
      case 'strong': return 'w-full';
      default: return 'w-0';
    }
  };

  return (
    <div className="mt-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-600">ความแข็งแกร่ง:</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(validation.strength)} ${getStrengthWidth(validation.strength)}`}
          />
        </div>
        <span className={`text-xs font-medium ${
          validation.strength === 'weak' ? 'text-red-600' :
          validation.strength === 'medium' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {getStrengthText(validation.strength)}
        </span>
      </div>

      {/* Error Messages */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-xs text-red-600 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-600 rounded-full"></span>
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Success Message */}
      {validation.isValid && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <span className="w-3 h-3 text-green-600">✓</span>
          รหัสผ่านปลอดภัย
        </p>
      )}
    </div>
  );
}