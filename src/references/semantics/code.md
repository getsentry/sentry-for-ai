# Code attributes

Source location attributes — function, file, line, namespace.

| Key | Type | Brief |
| --- | --- | --- |
| `code.file.path` | `string` | The source code file name that identifies the code unit as uniquely as possible (preferably an absolute file path). |
| `code.function` | `string` | The method or function name, or equivalent (usually rightmost part of the code unit’s name). |
| `code.function.name` | `string` | The method or function fully-qualified name without arguments. |
| `code.line.number` | `integer` | The line number in code.filepath best representing the operation. It SHOULD point within the code unit named in code.function |
| `code.namespace` | `string` | The ‘namespace’ within which code.function is defined. Usually the qualified class or module name, such that code.namespace + some separator + code.function form a unique identifier for the code unit. |
