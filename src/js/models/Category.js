class Category {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.color = data.color || '#4a90e2';
        this.icon = data.icon || '📁';
        this.parent = data.parent || null;
        this.created = data.created || new Date().toISOString();
        this.modified = data.modified || new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            icon: this.icon,
            parent: this.parent,
            created: this.created,
            modified: this.modified
        };
    }

    static fromJSON(json) {
        return new Category(json);
    }
}

export default Category;