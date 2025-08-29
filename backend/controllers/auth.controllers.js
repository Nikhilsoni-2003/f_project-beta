import sendMail from "../config/Mail.js";
import genToken from "../config/token.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signUp = async (req, res) => {
  try {
    const { name, email, password, userName } = req.body;
    console.log('Request body:', req.body); // Debug: Log the request body

    // Validate required fields
    if (!name || !email || !password || !userName) {
      return res.status(400).json({ message: 'Name, email, password, and userName are required' });
    }

    // Validate userName is a non-empty string
    if (typeof userName !== 'string' || userName.trim() === '') {
      return res.status(400).json({ message: 'userName must be a non-empty string' });
    }

    // Check for existing email
    const findByEmail = await User.findOne({ email });
    if (findByEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check for existing userName (case-sensitive)
    const findByUserName = await User.findOne({ userName });
    if (findByUserName) {
      console.log('Existing userName found:', findByUserName); // Debug: Log existing user
      return res.status(400).json({ message: `userName "${userName}" already exists` });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      name,
      userName,
      email,
      password,
    });

    // Generate token
    const token = await genToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'Strict',
    });

    return res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      console.log('Duplicate key error:', { field, value }); // Debug: Log duplicate key details
      return res.status(400).json({ message: `${field} "${value}" already exists` });
    }
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error during signup' });
  }
};

export const signIn = async (req, res) => {
  try {
    const { password, userName } = req.body;

    // Validate required fields
    if (!userName || !password) {
      return res.status(400).json({ message: 'userName and password are required' });
    }

    const user = await User.findOne({ userName });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    const token = await genToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'Strict',
    });

    return res.status(200).json(user);
  } catch (error) {
    console.error('Signin error:', error);
    return res.status(500).json({ message: `Server error during signin` });
  }
};

export const signOut = async (req, res) => {
  try {
    res.clearCookie('token');
    return res.status(200).json({ message: 'Sign out successful' });
  } catch (error) {
    console.error('Signout error:', error);
    return res.status(500).json({ message: `Server error during signout` });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.resetOtp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.isOtpVerified = false;

    await user.save();
    await sendMail(email, otp);
    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ message: `Server error during OTP send` });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user || user.resetOtp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: `Server error during OTP verification` });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isOtpVerified) {
      return res.status(400).json({ message: 'OTP verification required' });
    }

    user.password = password; // Will be hashed by pre-save hook
    user.isOtpVerified = false;
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: `Server error during password reset` });
  }
};