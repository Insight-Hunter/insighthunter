export class Entity {
    _id;
    props;
    constructor(id, props) {
        this._id = id;
        this.props = props;
    }
    get id() {
        return this._id;
    }
    equals(other) {
        return this._id.equals(other._id);
    }
}
//# sourceMappingURL=Entity.js.map