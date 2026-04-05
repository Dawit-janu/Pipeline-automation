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
                bat 'npm install'
            }
        }
        stage('Test') {
            steps {
                echo 'Running Cypress tests...'
                bat 'npx cypress run'
            }
        }
    }
    post {
        success { echo 'Semua test berhasil! ✅' }
        failure { echo 'Ada test yang gagal! ❌' }
    }
}
