pipeline {
    agent any
    stages {
        stage('Clone') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }
        stage('Install') {
            steps {
                echo 'Installing dependencies...'
                bat 'npm ci'
            }
        }
        stage('Test') {
            steps {
                echo 'Running Cypress tests...'
                bat 'npx cypress run --headless'
            }
        }
    }
    post {
        success { echo 'Semua test berhasil! ✅' }
        failure { echo 'Ada test yang gagal! ❌' }
    }
}
