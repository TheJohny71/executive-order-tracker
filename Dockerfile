FROM public.ecr.aws/lambda/nodejs:18

# Set npm version explicitly and configure npm
RUN npm install -g npm@latest && \
    npm config set registry https://registry.npmjs.org/

# Install Chrome dependencies
RUN yum install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    nss \
    libnss3.so \
    && yum clean all \
    && rm -rf /var/cache/yum

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with verbose logging and proper flags
RUN npm install --legacy-peer-deps --verbose || exit 1

# Copy and build TypeScript files
COPY . ./
RUN npm run build || exit 1

# Clean up dev dependencies
RUN npm prune --production --legacy-peer-deps

# Set the Lambda handler
CMD [ "dist/index.handler" ]
