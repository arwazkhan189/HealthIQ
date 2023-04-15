const handleErrors = (err) => {
  if (err.message.includes("auth/email-already-in-use")) {
    return "Email is already registered !!!";
  }

  if (err.message.includes("auth/user-not-found")) {
    return "User doesn't exist !!!";
  }

  if (err.message.includes("auth/wrong-password")) {
    return "Wrong Email or Password !!!";
  }

  if (err.message.includes("auth/weak-password")) {
    return "Weak Password : Password should be at least 6 characters";
  }

  if (err.message.includes("auth/network-request-failed")) {
    return "Network Loss...";
  } else {
    return "Unexpected Error occurred...";
  }
};

exports.handleErrors = (e) => handleErrors(e);
