import React, { useState, useRef, useEffect } from 'react';

export default function OTPInput({ length = 6, value, onChange }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    // If value prop is empty string (like reset), clear the boxes
    if (value === "") {
      setOtp(new Array(length).fill(""));
    }
  }, [value, length]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp((prevOtp) => {
      const newOtp = [...prevOtp];
      newOtp[index] = element.value;
      const combinedValue = newOtp.join("");
      onChange(combinedValue);
      return newOtp;
    });

    // Focus next input
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && inputRefs.current[index - 1]) {
        // If current is empty, move focus to previous and clear it
        inputRefs.current[index - 1].focus();
        setOtp((prevOtp) => {
          const newOtp = [...prevOtp];
          newOtp[index - 1] = "";
          onChange(newOtp.join(""));
          return newOtp;
        });
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length).split("");
    if (pastedData.some(isNaN)) return;

    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      newOtp[index] = char;
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });
    setOtp(newOtp);
    onChange(newOtp.join(""));
    
    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pastedData.length, length - 1);
    if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center my-2" onPaste={handlePaste}>
      {otp.map((data, index) => {
        return (
          <input
            key={index}
            type="text"
            maxLength="1"
            ref={(ref) => inputRefs.current[index] = ref}
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="w-10 h-12 text-center text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 transition-all shadow-sm placeholder-slate-300"
            placeholder="-"
          />
        );
      })}
    </div>
  );
}
