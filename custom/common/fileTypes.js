const fileTypes = [
  {
    type: 'png',
    mime: 'image/png',
    name: 'PNG',
    icon_class: 'fa-solid fa-file-image'
  },
  {
    type: 'jpg',
    mime: 'image/jpg',
    name: 'JPG',
    icon_class: 'fa-solid fa-file-image'
  },
  {
    type: 'svg',
    mime: 'image/svg+xml',
    name: 'SVG',
    icon_class: 'fa-solid fa-file-image'
  },
  {
    type: 'pdf',
    mime: 'application/pdf',
    name: 'PDF',
    icon_class: 'fa-solid fa-file-pdf'
  },
  {
    type: 'docs',
    mime: 'application/vnd.google-apps.document',
    name: 'Google Docs',
    icon_class: 'fa-solid fa-file-lines'
  },
  {
    type: 'sheets',
    mime: 'application/vnd.google-apps.spreadsheet',
    name: 'Google Sheets',
    icon_class: 'fa-solid fa-file-excel'
  },
  {
    type: 'slides',
    mime: 'application/vnd.google-apps.presentation',
    name: 'Google Slides',
    icon_class: 'fa-solid fa-file-powerpoint'
  },
  {
    type: 'drawings',
    mime: 'application/vnd.google-apps.drawing',
    name: 'Google Drawings',
    icon_class: 'fa-solid fa-file-image'
  },
  {
    type: 'shortcut',
    mime: 'application/vnd.google-apps.shortcut',
    name: 'Google Shortcut',
    icon_class: 'fa-solid fa-page-caret-up'
  },
  {
    type: 'video',
    mime: 'video/mp4',
    name: 'Video',
    icon_class: 'fa-solid fa-video'
  },
];

const mimeTypes = fileTypes.reduce((a, v) => ({ ...a, [v.type]: v.mime }), {});

const iconTypes = fileTypes.reduce((a, v) => ({ ...a, [`${v.mime}`]: { name: v.name, icon_class: v.icon_class }}), {});

const fileTypeNames = fileTypes.reduce((a, v) => ({ ...a, [v.name]: v.type }), {});

module.exports = { mimeTypes, iconTypes, fileTypeNames }
