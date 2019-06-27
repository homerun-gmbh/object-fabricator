export function validateModelName(modelName) {
  if (typeof modelName !== 'string') {
    throw new Error('Please provide a valid model name');
  }
}

export function validateAttributes(attributes) {
  if (typeof attributes !== 'object') {
    throw new Error('Please provide attributes as an object');
  }

  Object.values(attributes).forEach((attrValue) => {
    const attrType = typeof attrValue;

    if (attrType.match(/^(function|string|boolean)$/)) { return; }

    throw new Error(
      'Attribute values can only be functions, strings'
      + ` or booleans, but received: ${attrType}`
    )
  })
}

export function validateCreateMany(count, attributes) {
  if (typeof count !== 'number') {
    throw new Error(
      'Please provide the number of'
      + ' objects that should be created'
    );
  }

  validateAttributes(attributes);
}

class ObjectFabricator {
  constructor(modelName, attributes = {}) {
    validateModelName(modelName);
    validateAttributes(attributes);

    this.attributes = attributes;
    this.modelName = modelName;
    this.currentId = 0;
    this.count = 0;
    this.associations = [];
    this.filledAttrs = {};
  }

  static sequence(sequenceValueFunction) {
    return instance => sequenceValueFunction(instance.currentId);
  }

  static template (templateValueFunction) {
    return instance => templateValueFunction(instance.filledAttrs);
  }

  static associate(fabricator, attributes = {}) {
    return parentInstance => (
      fabricator.associationCreate(parentInstance, attributes)
    );
  }

  static associateToMany(fabricator, count, attributes = {}) {
    return parentInstance => (
      fabricator.associationCreateMany(
        parentInstance,
        count,
        attributes
      )
    );
  }

  extend(modelName, attributes = {}) {
    return new ObjectFabricator(
      modelName,
      { ...this.attributes, ...attributes }
    );
  }

  generateId() {
    this.currentId += 1;
  }

  increaseCount() {
    this.count += 1;
  }

  saveToAssociation = (instance) => {
    this.associations.push(instance);
  }

  fillAttr(attribute) {
    if (typeof attribute === 'function') { return attribute(this); }

    return attribute;
  }

  fabricateObject(attrs) {
    this.generateId();

    Object.keys(attrs).forEach((key) => {
      const value = this.fillAttr(attrs[key]);

      this.filledAttrs = { ...this.filledAttrs, [key]: value };
    });

    return { id: this.currentId, ...this.filledAttrs };
  }

  associationCreate(instance, attributes) {
    instance.saveToAssociation(this);

    return this.create(attributes);
  }

  associationCreateMany(instance, count, attributes = {}) {
    instance.saveToAssociation(this);

    return this.createMany(count, attributes);
  }

  create(attributes = {}) {
    return this.fabricateObject({ ...this.attributes, ...attributes });
  }

  createMany(count, attributes = {}) {
    validateCreateMany(count, attributes);

    const factoryResults = [];
    let counter;

    for (counter = 0; counter < count; counter += 1) {
      factoryResults.push(this.fabricateObject({
        ...this.attributes,
        ...attributes
      }));
    }

    return factoryResults;
  }

  cleanAssociations() {
    this.associations.forEach((association) => {
      association.clean();
    });
  }

  clean() {
    this.cleanAssociations();
    this.currentId = 0;
  }
}

export default ObjectFabricator;
