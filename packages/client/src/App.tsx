import React from 'react';
import { z } from 'zod';

const depSchema = z.record(z.string());

const schema = z.object({
  dependencies: depSchema,
  devDependencies: depSchema,
});

function parseVersion(version: string) {
  const chars = version.split('');

  if (chars[0] === '^' || chars[0] === '~') {
    return version.slice(1);
  }

  return version;
}

export default function App() {
  const [input, setInput] = React.useState();

  const onChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(JSON.parse(e.target.value));
  }, []);

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!input) {
        return;
      }

      const unknown = schema.safeParse(input);

      if (!unknown.success) {
        return;
      }

      const deps = Object.entries(unknown.data.dependencies).map(([name, version]) => {
        return { name, version: parseVersion(version) };
      });
      const devDeps = Object.entries(unknown.data.devDependencies).map(([name, version]) => {
        return { name, version: parseVersion(version) };
      });

      const dependencies = [...deps, ...devDeps];

      fetch('http://localhost:8080/dependencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dependencies),
      })
        .then((res) => res.json())
        .then((res) => console.log(res));
    },
    [input]
  );

  return (
    <div className="App">
      <h1>package json changeset</h1>
      <form onSubmit={onSubmit}>
        <textarea
          style={{ width: '300px', height: '500px' }}
          onChange={onChange}
          placeholder="paste package json here"
        />
        <button type="submit">Submit for processing</button>
      </form>
    </div>
  );
}
