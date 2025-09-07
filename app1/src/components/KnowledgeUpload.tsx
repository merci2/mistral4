const KnowledgeUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      let content = '';
      
      if (file.type === 'application/pdf') {
        content = await extractPDFContent(file);
      } else if (file.type.includes('text')) {
        content = await file.text();
      }

      await knowledgeBaseService.addDocument(
        file.name,
        content,
        { source: 'upload', fileType: file.type }
      );
      
      // Success feedback
    } catch (error) {
      // Error handling
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="knowledge-upload">
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        accept=".txt,.pdf,.docx"
      />
      {isUploading && <div>Uploading...</div>}
    </div>
  );
};