# Create AWS Cluster with pre defined Cidr Block.
resource "aws_vpc" "main" {
  cidr_block        = var.aws_cidr_block

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "var.vpc_name-${terraform.workspace}"
  }  
}

# Create var.az_count private subnets, each in a different AZ.
resource "aws_subnet" "priv_subnet_1" {
  cidr_block        = cidrsubnet(var.aws_cidr_block, 8, 100)
  availability_zone = var.priv_subnet_1
  vpc_id            = aws_vpc.main.id

  tags = {
    Name = "Private subnet-1-${terraform.workspace}"
    Tier = "private"
  }
}

resource "aws_subnet" "priv_subnet_2" {
  cidr_block        = cidrsubnet(var.aws_cidr_block, 8, 101)
  availability_zone = var.priv_subnet_2
  vpc_id            = aws_vpc.main.id

  tags = {
    Name = "Private subnet-2-${terraform.workspace}"
    Tier = "private"
  }
}

resource "aws_subnet" "priv_subnet_3" {
  cidr_block        = cidrsubnet(var.aws_cidr_block, 8, 102)
  availability_zone = var.priv_subnet_3
  vpc_id            = aws_vpc.main.id

  tags = {
    Name = "Private subnet-3-${terraform.workspace}"
    Tier = "private"
  }
}


resource "aws_subnet" "pub_subnet_1" {
  cidr_block              = cidrsubnet(var.aws_cidr_block, 8,0)
  availability_zone       = var.pub_subnet_1
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true

  tags = {
    Name = "Public subnet-1-${terraform.workspace}"    
    Tier = "public"
  }  
}


resource "aws_subnet" "pub_subnet_2" {
  cidr_block              = cidrsubnet(var.aws_cidr_block, 8,1)
  availability_zone       = var.pub_subnet_2
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true

  tags = {
    Name = "Public subnet-2-${terraform.workspace}"    
    Tier = "public"
  }  
}

resource "aws_subnet" "pub_subnet_3" {
  cidr_block              = cidrsubnet(var.aws_cidr_block, 8,2)
  availability_zone       = var.pub_subnet_3
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true

  tags = {
    Name = "Public subnet-3-${terraform.workspace}"    
    Tier = "public"
  }  
}
# Internet Gateway for the public subnet.
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

# Route the public subnet traffic through the IGW.
resource "aws_route" "internet_access" {
  route_table_id         = aws_vpc.main.main_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.gw.id
}

# Create a NAT gateway with an Elastic IP for each private subnet to get internet connectivity.
resource "aws_eip" "gw" {
  vpc        = true
  depends_on = [aws_internet_gateway.gw]
}

resource "aws_nat_gateway" "gw" {
  subnet_id     = aws_subnet.pub_subnet_1.id
  allocation_id = aws_eip.gw.id
}

# Create a new route table for the private subnets, make it route non-local traffic through the NAT gateway to the internet.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.gw.id
  }
  tags = {
    Name = "Private Route table-${terraform.workspace}"    
    Tier = "private"
  }    
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
  tags = {
    Name = "Public Route table-${terraform.workspace}"    
    Tier = "Public"
  }    
}

# Explicitly associate the newly created route tables to the private subnets (so they don't default to the main route table).
resource "aws_route_table_association" "priv_subnet_1" {
  subnet_id      = aws_subnet.priv_subnet_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "priv_subnet_2" {
  subnet_id      = aws_subnet.priv_subnet_2.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "priv_subnet_3" {
  subnet_id      = aws_subnet.priv_subnet_3.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "pub_subnet_1" {
  subnet_id      = aws_subnet.pub_subnet_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "pub_subnet_2" {
  subnet_id      = aws_subnet.pub_subnet_2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "pub_subnet_3" {
  subnet_id      = aws_subnet.pub_subnet_3.id
  route_table_id = aws_route_table.public.id
}

