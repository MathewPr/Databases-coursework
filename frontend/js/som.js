const SOM_OBJECTS = [
  {
    name: 'USER', type: 'compound',
    attrs: [
      {name:'UserId', card:'1.1', id:true, obj:false, note:''},
      {name:'Email', card:'1.1', id:false, obj:false, note:'AK, уникальный'},
      {name:'FullName', card:'1.1', id:false, obj:false, note:''},
      {name:'RegisteredAt', card:'1.1', id:false, obj:false, note:''},
      {name:'IsActive', card:'1.1', id:false, obj:false, note:'boolean'},
      {name:'ORDER', card:'0.N', id:false, obj:true, note:'объектный атрибут'},
      {name:'REVIEW', card:'0.N', id:false, obj:true, note:'объектный атрибут'},
      {name:'USER_SESSION', card:'0.N', id:false, obj:true, note:'объектный атрибут'},
    ]
  },
  {
    name: 'AUTHOR', type: 'compound',
    attrs: [
      {name:'AuthorId', card:'1.1', id:true, obj:false, note:''},
      {name:'FullName', card:'1.1', id:false, obj:false, note:''},
      {name:'Biography', card:'0.1', id:false, obj:false, note:'GIN FTS'},
      {name:'BirthDate', card:'0.1', id:false, obj:false, note:''},
      {name:'Country', card:'0.1', id:false, obj:false, note:''},
      {name:'BOOK', card:'0.N', id:false, obj:true, note:'объектный атрибут'},
    ]
  },
  {
    name: 'CATEGORY', type: 'compound',
    attrs: [
      {name:'CategoryId', card:'1.1', id:true, obj:false, note:''},
      {name:'Name', card:'1.1', id:false, obj:false, note:''},
      {name:'CATEGORY', card:'0.1', id:false, obj:true, note:'родительская категория'},
      {name:'BOOK', card:'0.N', id:false, obj:true, note:'объектный атрибут'},
    ]
  },
  {
    name: 'BOOK', type: 'hybrid',
    attrs: [
      {name:'BookId', card:'1.1', id:true, obj:false, note:''},
      {name:'ISBN', card:'1.1', id:false, obj:false, note:'AK, уникальный'},
      {name:'Title', card:'1.1', id:false, obj:false, note:'GIN trgm'},
      {name:'Description', card:'0.1', id:false, obj:false, note:'GIN FTS'},
      {name:'PublicationYear', card:'0.1', id:false, obj:false, note:'B-tree'},
      {name:'Pages', card:'0.1', id:false, obj:false, note:''},
      {name:'Price', card:'1.1', id:false, obj:false, note:'B-tree'},
      {name:'Tags', card:'0.N', id:false, obj:false, note:'многозначный, GIN'},
      {name:'Metadata', card:'0.1', id:false, obj:false, note:'групповой, GIN jsonb'},
      {name:'AUTHOR', card:'1.N', id:false, obj:true, note:'обязательно ≥1'},
      {name:'CATEGORY', card:'1.N', id:false, obj:true, note:'обязательно ≥1'},
      {name:'REVIEW', card:'0.N', id:false, obj:true, note:''},
      {name:'StockInfo [WAREHOUSE+Qty]', card:'0.N', id:false, obj:true, note:'гибридный атрибут'},
    ]
  },
  {
    name: 'WAREHOUSE', type: 'simple',
    attrs: [
      {name:'WarehouseId', card:'1.1', id:true, obj:false, note:''},
      {name:'Name', card:'1.1', id:false, obj:false, note:''},
      {name:'Location', card:'1.1', id:false, obj:false, note:'GiST'},
      {name:'Capacity', card:'0.1', id:false, obj:false, note:''},
    ]
  },
  {
    name: 'ORDER', type: 'hybrid',
    attrs: [
      {name:'OrderId', card:'1.1', id:true, obj:false, note:''},
      {name:'Status', card:'1.1', id:false, obj:false, note:'new/paid/shipped/...'},
      {name:'TotalAmount', card:'1.1', id:false, obj:false, note:''},
      {name:'CreatedAt', card:'1.1', id:false, obj:false, note:'BRIN'},
      {name:'UpdatedAt', card:'1.1', id:false, obj:false, note:''},
      {name:'USER', card:'1.1', id:false, obj:true, note:'обязателен'},
      {name:'LineItem [BOOK+Qty+Price]', card:'1.N', id:false, obj:true, note:'мин. 1 позиция'},
    ]
  },
  {
    name: 'REVIEW', type: 'compound',
    attrs: [
      {name:'ReviewId', card:'1.1', id:true, obj:false, note:''},
      {name:'Rating', card:'1.1', id:false, obj:false, note:'1..5'},
      {name:'ReviewText', card:'0.1', id:false, obj:false, note:'GIN FTS'},
      {name:'IsPublished', card:'1.1', id:false, obj:false, note:'частичный индекс'},
      {name:'CreatedAt', card:'1.1', id:false, obj:false, note:''},
      {name:'USER', card:'1.1', id:false, obj:true, note:''},
      {name:'BOOK', card:'1.1', id:false, obj:true, note:''},
    ]
  },
  {
    name: 'USER_SESSION', type: 'compound',
    attrs: [
      {name:'SessionId', card:'1.1', id:true, obj:false, note:''},
      {name:'IP', card:'1.1', id:false, obj:false, note:'SP-GiST, inet'},
      {name:'StartedAt', card:'1.1', id:false, obj:false, note:''},
      {name:'UserAgent', card:'0.1', id:false, obj:false, note:''},
      {name:'USER', card:'1.1', id:false, obj:true, note:''},
    ]
  },
  {
    name: 'STOCK', type: 'assoc',
    attrs: [
      {name:'BOOK', card:'1.1', id:true, obj:true, note:'объектный идентификатор'},
      {name:'WAREHOUSE', card:'1.1', id:true, obj:true, note:'объектный идентификатор'},
      {name:'Quantity', card:'1.1', id:false, obj:false, note:'доп. информация'},
    ]
  },
];

const TYPE_LABELS = {
  simple: 'Простой', composite: 'Составной', compound: 'Сложный',
  hybrid: 'Гибридный', assoc: 'Ассоциативный'
};

function buildSOM() {
  const grid = document.getElementById('som-grid');
  for (const obj of SOM_OBJECTS) {
    const card = document.createElement('div');
    card.className = 'som-card';
    const header = document.createElement('div');
    header.className = 'som-card-header';
    header.innerHTML = `<h3>${obj.name}</h3><span class="som-type-badge type-${obj.type}">${TYPE_LABELS[obj.type]}</span>`;
    card.appendChild(header);

    const attrsDiv = document.createElement('div');
    attrsDiv.className = 'som-attrs';
    let prevWasObj = false;

    for (const attr of obj.attrs) {
      if (attr.obj && !prevWasObj && attrsDiv.children.length > 0) {
        const hr = document.createElement('hr');
        hr.className = 'som-divider';
        attrsDiv.appendChild(hr);
      }
      prevWasObj = attr.obj;

      const row = document.createElement('div');
      row.className = 'som-attr';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'som-attr-name' + (attr.id ? ' is-id' : '') + (attr.obj ? ' is-obj' : '');
      nameSpan.textContent = (attr.id ? 'ID  ' : '    ') + (attr.obj ? '[' + attr.name + ']' : attr.name);
      const cardSpan = document.createElement('span');
      cardSpan.className = 'som-attr-card';
      cardSpan.textContent = attr.card;
      row.appendChild(nameSpan);
      row.appendChild(cardSpan);
      if (attr.note) {
        const note = document.createElement('span');
        note.className = 'som-attr-note';
        note.textContent = attr.note;
        row.appendChild(note);
      }
      attrsDiv.appendChild(row);
    }
    card.appendChild(attrsDiv);
    grid.appendChild(card);
  }
}
