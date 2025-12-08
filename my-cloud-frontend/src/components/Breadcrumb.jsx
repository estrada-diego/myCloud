export default function Breadcrumb({ path, onClickRoot, onNavigate }) {
  
    return (
      <ol className="breadcrumb text-big container-p-x py-3 m-0">
        {path.map((p, i) => (
          <li
            key={i}
            className={`breadcrumb-item ${i === path.length - 1 ? "active" : ""}`}
          >
            {i < path.length - 1 ? (
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(i); }}>
                {p.name}
              </a>
            ) : (
              p.name
            )}
          </li>
        ))}
      </ol>
    );
  }