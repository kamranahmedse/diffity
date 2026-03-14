interface FolderIconProps {
  open: boolean;
}

export function FolderIcon(props: FolderIconProps) {
  if (props.open) {
    return (
      <svg className="w-4 h-4 shrink-0 text-accent opacity-80" viewBox="0 0 16 16" fill="currentColor">
        <path d="M.513 1.513A1.75 1.75 0 011.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 00.2.1h6.5A1.75 1.75 0 0116 4.75v8.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75c0-.464.184-.91.513-1.237zM1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H7.5c-.55 0-1.07-.26-1.4-.7l-.9-1.2a.25.25 0 00-.2-.1h-3.5a.25.25 0 00-.25.25z" />
      </svg>
    );
  }

  return (
    <svg className="w-4 h-4 shrink-0 text-accent opacity-80" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z" />
    </svg>
  );
}
