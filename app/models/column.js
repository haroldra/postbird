global.Model.Column = Model.base.extend({
  init: function (name, data) {
    if (typeof name == 'object') {
      this._super({});
      Object.keys(name).forEach(function(attr) {
        this[attr] = name[attr];
      }.bind(this));

      // set defaults
      if (this.default_value === undefined) {
        this.default_value = null;
      }

      // reset changes on initialization
      this.changes = {};

    } else {
      this._super(data);
      this.name = name;
    }
    //this.is_primary_key = this. //
  },

  update: function(formData) {
    var formLikeData = {
      name: this.data.column_name,
      type: this.data.data_type,
      max_length: this.data.character_maximum_length,
      default_value: this.data.column_default,
      allow_null: this.data.is_nullable == 'YES'
    };

    var diff = {};
    for (var k in formLikeData) {
      if (data.hasOwnProperty(k)) {
        if (formLikeData[k] != formData[k]) {
          diff[k] = formData[k];
        }
      }
    }

    console.log(diff);
    // TODO: finish here
  },

  save: function(callback) {
    this.shouldHaveTable();
    this.save_renameColumn(function() {
      callback()
    }.bind(this));
    // ALTER TABLE tbl_name ALTER COLUMN col_name TYPE varchar (11);
    // ALTER TABLE tbl_name RENAME COLUMN col_name TO new_col_name;
  },

  save_renameColumn: function (callback) {
    if (this.changes['name']) {
      var oldName = this.changes['name'][0];
      var newName = this.changes['name'][1];
      this.q('ALTER TABLE %s RENAME COLUMN %s TO %s;', this.table.table, oldName, newName, function (rows, error) {
        if (!error) {
          delete this.changes['name'];
        }
        callback();
      }.bind(this));
    } else {
      callback();
    }
  },

  drop: function (callback) {
    this.shouldHaveTable();
    this.q("ALTER TABLE %s DROP COLUMN %s", this.table.table, this.name, function(data, error) {
      callback();
    });
  },

  shouldHaveTable: function() {
    if (!this.table) {
      throw "Column should be attached to table. column.table property should be set.";
    }
  }
});

Model.Column.attributesAliases = {
  name: 'column_name',
  type: 'data_type',
  default_value: 'column_default',
  max_length: 'character_maximum_length'
};

Object.keys(Model.Column.attributesAliases).forEach(function(attr) {
  var data_attr = Model.Column.attributesAliases[attr];
  Object.defineProperty(Model.Column.prototype, attr, {
    get: function () {
      return this.data[data_attr];
    },

    set: function (value) {
      if (this.data[data_attr] != value) {
        this.changes = this.changes || {};
        this.changes[attr] = [this.data[data_attr], value];
        this.data[data_attr] = value;
      }
      return this.data[data_attr];
    }
  });
});

Object.defineProperty(Model.Column.prototype, "allow_null", {
  get: function () {
    return (this.data.is_nullable == 'YES');
  },

  set: function (value) {
    return this.data.is_nullable = value ? 'YES' : 'NO';
  }
});

Model.Column.availableTypes = function (callback) {
  sql = (function () { /*

    SELECT n.nspname as "schema",
      pg_catalog.format_type(t.oid, NULL) AS "name",
      pg_catalog.obj_description(t.oid, 'pg_type') as "description"
    FROM pg_catalog.pg_type t
         LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
      AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
      AND pg_catalog.pg_type_is_visible(t.oid)
    ORDER BY 1, 2;

  */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];

  Model.base.q(sql, function(data) {
    callback(data.rows);
  });
};