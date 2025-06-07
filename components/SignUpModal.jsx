export default function SignUpModal({
  isOpen,
  onClose,
  onSignUp,
  email,
  password,
  firstName,
  lastName,
  graduationYear,
  role,
  onEmailChange,
  onPasswordChange,
  onFirstNameChange,
  onLastNameChange,
  onGraduationYearChange,
  onRoleChange,
  error,
  disabled,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h2 className="text-2xl font-semibold mb-6 text-center">Sign Up</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault(); // Prevent page refresh
            onSignUp();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={onFirstNameChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                placeholder="Enter first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={onLastNameChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                placeholder="Enter last name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={onEmailChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                placeholder="Enter email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={onPasswordChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                placeholder="Enter password"
              />
            </div>

            {/* Graduation Year */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Graduation Year
              </label>
              <input
                type="number"
                value={graduationYear}
                onChange={onGraduationYearChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                placeholder="Enter graduation year"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Role
              </label>
              <select
                value={role}
                onChange={onRoleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-500 mt-4">{error}</p>}

          {/* Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={onSignUp}
              disabled={disabled}
              className={`w-full sm:w-auto px-4 py-2 rounded ${
                disabled
                  ? "bg-gray-500 text-white cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {disabled ? "Signing Up..." : "Sign Up"}
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
