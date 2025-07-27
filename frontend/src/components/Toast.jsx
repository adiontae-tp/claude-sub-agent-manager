const Toast = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-md transition-opacity ${
      message.type === 'error' ? 'bg-red-600 text-white' : 
      message.type === 'success' ? 'bg-green-600 text-white' : 
      'bg-blue-600 text-white'
    }`}>
      <div className="flex items-start gap-2">
        <p className="flex-1">{message.text}</p>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;