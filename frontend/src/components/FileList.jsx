import FileContainer from './FileContainer';


export default function FileList({ files, onOpen, viewMode }) {

  return (
    <div id="fileContainer" className={`file-manager-container file-manager-col-view file-list ${viewMode}`}>
      {files.map((file) => {
        return (
          <FileContainer key={file.id} file={file} onOpen={onOpen} viewMode={viewMode}></FileContainer>
        );
      })}
    </div>
  );
}
