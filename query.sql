CREATE TABLE Produto (
  id SERIAL PRIMARY KEY,
  cod_barras VARCHAR(20),
  nome VARCHAR(100),
  quantidade INT,
  preco FLOAT,
  categoria VARCHAR(30)
);

CREATE TABLE Funcionario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100),
  cpf VARCHAR(11),
  telefone VARCHAR(9),
  cargo TEXT,
  salario FLOAT
);

CREATE TABLE Fornecedor (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100),
  cnpj VARCHAR(14),
  telefone VARCHAR(9)
);

CREATE TABLE Cliente (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100),
  cpf VARCHAR(11),
  telefone VARCHAR(9)
);

CREATE TABLE Compra (
  id SERIAL PRIMARY KEY,
  data DATE,
  valor FLOAT,
  id_cliente INT NULL,
  id_funcionario INT,
  FOREIGN KEY (id_cliente) REFERENCES Cliente(id),
  FOREIGN KEY (id_funcionario) REFERENCES Funcionario(id)
);

CREATE TABLE Encomenda (
  id SERIAL PRIMARY KEY,
  data DATE,
  quantidade INT,
  preco_compra FLOAT,
  id_produto INT,
  id_fornecedor INT,
  FOREIGN KEY (id_produto) REFERENCES Produto(id),
  FOREIGN KEY (id_fornecedor) REFERENCES Fornecedor(id)
);

CREATE TABLE ItemDaCompra (
  id SERIAL PRIMARY KEY,
  quantidade INT,
  subtotal FLOAT,
  preco_unitario FLOAT,
  id_compra INT,
  id_produto INT,
  FOREIGN KEY (id_compra) REFERENCES Compra(id),
  FOREIGN KEY (id_produto) REFERENCES Produto(id)
);