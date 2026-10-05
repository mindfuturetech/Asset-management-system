const errorHandler = (
  error,
  req,
  res,
  next
) => {
  console.error(error);

  let statusCode = 500;

  if (
    error.message?.includes(
      "Account not found"
    )
  ) {
    statusCode = 404;
  }

  if (
    error.message?.includes(
      "Invalid OTP"
    ) ||
    error.message?.includes(
      "OTP expired"
    ) ||
    error.message?.includes(
      "OTP already used"
    )
  ) {
    statusCode = 400;
  }

  if (
    error.code === 11000
  ) {
    statusCode = 409;
  }

  return res.status(statusCode).json({
    success: false,
    message:
      error.message ||
      "Internal server error",
  });
};

module.exports = {
  errorHandler,
};