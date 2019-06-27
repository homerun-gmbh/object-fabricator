import ObjectFabricator from '../src';

const buildTestUserFabricator = attributes => (
  new ObjectFabricator(
    'User',
    {
      name: 'Frodo',
      age: '30',
      email: 'Frodo@mail.com',
      ...attributes
    }
  )
);

const buildTestBookFabricator = attributes => (
  new ObjectFabricator(
    'Book',
    {
      title: ObjectFabricator.sequence(n => `Book ${n}`),
      ...attributes
    }
  )
);

let userFabricator;
let bookFabricator;

beforeEach(() => {
  userFabricator = buildTestUserFabricator();
  bookFabricator = buildTestBookFabricator();
});

afterEach(() => {
  userFabricator.clean();
  bookFabricator.clean();
});

describe('#constructor', () => {
  it('can be created', () => {
    const attributes = {};
    userFabricator = new ObjectFabricator('User', attributes);
    expect(userFabricator).toBeInstanceOf(ObjectFabricator);
    expect(userFabricator.modelName).toEqual('User');
    expect(userFabricator.attributes).toEqual(attributes);
  });

  it('can be created without attributes', () => {
    userFabricator = new ObjectFabricator('User');
    expect(userFabricator).toBeInstanceOf(ObjectFabricator);
  });

  it('validates Model', () => {
    /* eslint-disable no-new */
    function noModel() {
      new ObjectFabricator();
    }

    function invalidModel() {
      new ObjectFabricator(2);
    }

    expect(noModel).toThrowError('Please provide a valid model name');
    expect(invalidModel).toThrowError('Please provide a valid model name');
  });

  it('validates attributes', () => {
    function invalidAttributes() {
      new ObjectFabricator('User', 3);
    }

    function objectAttribute() {
      new ObjectFabricator('User', {});
    }

    function functionAttribute() {
      new ObjectFabricator('User', () => {});
    }

    expect(invalidAttributes)
      .toThrowError('Please provide attributes as an object');
    expect(functionAttribute)
      .toThrowError('Please provide attributes as an object');
    expect(objectAttribute).not.toThrowError();
  });

  it('saves the attributes', () => {
    expect(userFabricator.attributes).toEqual({
      name: 'Frodo',
      age: '30',
      email: 'Frodo@mail.com',
    });
  });
});

describe('#extend', () => {
  it(
    'returns a fabricator that overrides'
    + ' and extends the parent attributes',
    () => {
      userFabricator = buildTestUserFabricator({ company: 'Google' });

      const appleEmployeeFabricator = userFabricator.extend(
        'appleEmployee',
        {
          company: 'Apple',
          hired: true
        }
      );

      expect(appleEmployeeFabricator.attributes).toMatchObject({
        name: 'Frodo',
        company: 'Apple',
        hired: true
      });
    }
  );
});

describe('#associate', () => {
  it('returns a callback', () => {
    const createBook = ObjectFabricator.associate(bookFabricator);

    expect(createBook).toBeInstanceOf(Function);
  });

  describe('callback', () => {
    it('returns a fabricated model when called with a fabricator', () => {
      const libraryFabricator = new ObjectFabricator('Library');

      const createBookCallback = ObjectFabricator.associate(bookFabricator);

      expect(createBookCallback(libraryFabricator)).toEqual({
        id: 1,
        title: 'Book 1'
      });
    });

    it('saves the child fabricator reference in the parent fabricator', () => {
      const libraryFabricator = new ObjectFabricator('Library');

      const createBookCallback = ObjectFabricator.associate(bookFabricator);
      createBookCallback(libraryFabricator);

      expect(libraryFabricator.associations[0].modelName).toEqual('Book');
    });
  });
});

describe('#create', () => {
  let userObject;

  beforeEach(() => {
    userFabricator = buildTestUserFabricator({
      email: ObjectFabricator.sequence(n => `frodo_${n}@mail.com`)
    });

    userObject = userFabricator.create();
  });

  it('returns an object with an id', () => {
    expect(userObject.id).toEqual(1);
  });

  it('can handle static attributes', () => {
    expect(userObject).toMatchObject({ name: 'Frodo' });
  });

  it('can handle sequential attributes', () => {
    expect(userObject).toMatchObject({ email: 'frodo_1@mail.com' });
  });

  it('can handle template attributes', () => {
    userFabricator = buildTestUserFabricator({
      name: ObjectFabricator.sequence(n => `TestUser${n}`),
      email: ObjectFabricator.template(n => `${n.name}@gmail.com`)
    });

    const userWithAuthor = userFabricator.create();

    expect(userWithAuthor.email).toEqual('TestUser1@gmail.com');
  });

  describe('when attributes are passed', () => {
    it('overrides the initialized attributes that are duplicate', () => {
      userObject = userFabricator.create({ name: 'Sam' });
      expect(userObject).toMatchObject({
        name: 'Sam'
      });
    });

    it('extends the initialized attributes', () => {
      expect(userFabricator.create({ age: '30' }))
        .toMatchObject({ age: '30', name: 'Frodo' });
    });
  });

  describe('fabricator with one to one association', () => {
    it('returns an object with a nested association', () => {
      userFabricator = buildTestUserFabricator({
        name: ObjectFabricator.sequence(n => `Test User ${n}`),
        email: ObjectFabricator.sequence(n => `test_user${n}@mail.com`),
        book: ObjectFabricator.associate(bookFabricator)
      });

      expect(userFabricator.create()).toMatchObject({
        id: 1,
        name: 'Test User 1',
        email: 'test_user1@mail.com',
        book: { id: 1, title: 'Book 1' }
      });
    });
  });

  describe('fabricator with one to many association', () => {
    it('returns an object with a nested array of unique associations', () => {
      userFabricator = buildTestUserFabricator({
        name: ObjectFabricator.sequence(n => `Test User ${n}`),
        email: ObjectFabricator.sequence(n => `test_user${n}@mail.com`),
        book: ObjectFabricator.associateToMany(bookFabricator, 3)
      });

      expect(userFabricator.create()).toEqual({
        id: 1,
        name: 'Test User 1',
        email: 'test_user1@mail.com',
        age: '30',
        book: [
          { id: 1, title: 'Book 1' },
          { id: 2, title: 'Book 2' },
          { id: 3, title: 'Book 3' },
        ]
      });
    });
  });
});


describe('#createMany', () => {
  let userObjects;

  beforeEach(() => {
    userFabricator = buildTestUserFabricator({
      email: ObjectFabricator.sequence(n => `frodo_${n}@mail.com`)
    });

    userObjects = userFabricator.createMany(3);
  });

  it('returns a list of objects with ids', () => {
    expect(userObjects.length).toEqual(3);
    userObjects.forEach((user, index) => {
      expect(user.id).toEqual(index + 1);
    });
  });

  it('can handle sequential attributes', () => {
    userObjects.forEach((user, index) => {
      expect(user.email).toEqual(`frodo_${index + 1}@mail.com`);
    });
  });

  describe('fabricator with one to one association', () => {
    it('returns an array of objects, each with a unique association', () => {
      userFabricator = new ObjectFabricator(
        'User',
        {
          name: ObjectFabricator.sequence(n => `Test User ${n}`),
          email: ObjectFabricator.sequence(n => `test_user${n}@mail.com`),
          book: ObjectFabricator.associate(bookFabricator)
        }
      );

      const userTest = userFabricator.createMany(2);

      expect(userTest).toEqual([
        {
          id: 1,
          name: 'Test User 1',
          email: 'test_user1@mail.com',
          book: { id: 1, title: 'Book 1' }
        },
        {
          id: 2,
          name: 'Test User 2',
          email: 'test_user2@mail.com',
          book: { id: 2, title: 'Book 2' }
        },
      ]);
    });
  });

  describe('fabricator with one to many association', () => {
    it(
      'returns an array of objects, each with a nested'
      + ' array of unique associations',
      () => {
        userFabricator = buildTestUserFabricator({
          name: ObjectFabricator.sequence(n => `Test User ${n}`),
          email: ObjectFabricator.sequence(n => `test_user${n}@mail.com`),
          book: ObjectFabricator.associateToMany(bookFabricator, 3)
        });

        const result = userFabricator.createMany(2);

        expect(result).toEqual([
          {
            id: 1,
            name: 'Test User 1',
            email: 'test_user1@mail.com',
            age: '30',
            book: [
              { id: 1, title: 'Book 1' },
              { id: 2, title: 'Book 2' },
              { id: 3, title: 'Book 3' },
            ]
          },
          {
            id: 2,
            name: 'Test User 2',
            email: 'test_user2@mail.com',
            age: '30',
            book: [
              { id: 4, title: 'Book 4' },
              { id: 5, title: 'Book 5' },
              { id: 6, title: 'Book 6' },
            ]
          }
        ]);
      }
    );
  });
});

describe('#clean', () => {
  it('resets the fabricator', () => {
    userFabricator.create();
    userFabricator.clean();

    expect(userFabricator).toMatchObject({ currentId: 0 });
  });

  describe('fabricator with associations', () => {
    it('resets the associated fabricators', () => {
      userFabricator = buildTestUserFabricator({
        name: ObjectFabricator.sequence(n => `Test User ${n}`),
        email: ObjectFabricator.sequence(n => `test_user${n}@mail.com`),
        book: ObjectFabricator.associateToMany(bookFabricator, 3)
      });

      userFabricator.create();
      userFabricator.clean();

      expect(bookFabricator.currentId).toEqual(0);
    });
  });
});
