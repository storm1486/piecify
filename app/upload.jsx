function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (file) {
    console.log(`File name: ${file.name}`);
    console.log(`File size: ${file.size} bytes`);
    console.log(`File type: ${file.type}`);

    // Example: Read the file content (for text files)
    const reader = new FileReader();
    reader.onload = function (event) {
      console.log("File content:", event.target.result);
    };

    // Check if the file is a text file, and read it
    if (file.type === "text/plain") {
      reader.readAsText(file);
    } else {
      console.log("File reading is not implemented for this file type.");
    }

    // Here you can add the logic to send the file to a server, etc.
  } else {
    console.log("No file selected.");
  }
}
