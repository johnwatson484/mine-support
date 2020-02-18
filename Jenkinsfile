@Library('defra-library@0.0.17')
import uk.gov.defra.ffc.DefraUtils
def defraUtils = new DefraUtils()

def containerSrcFolder = '\\/home\\/node'
def containerTag = ''
def deployJobName = 'ffc-demo-web-deploy'
def dockerTestService = 'ffc-demo-web'
def ingressServer = 'ffc.aws-int.defra.cloud'
def kubeCredsId = 'FFCLDNEKSAWSS001_KUBECONFIG'
def lcovFile = './test-output/lcov.info'
def localSrcFolder = '.'
def mergedPrNo = ''
def pr = ''
def projectName = 'ffc-demo-web'
def regCredsId = 'ecr:eu-west-2:ecr-user'
def registry = '562955126301.dkr.ecr.eu-west-2.amazonaws.com'
def sonarQubeEnv = 'SonarQube'
def sonarScanner = 'SonarScanner'
def timeoutInMinutes = 5

node {
  checkout scm
  try {
    stage('Set GitHub status as pending'){
      defraUtils.setGithubStatusPending()
    }
    stage('Set PR, and containerTag variables') {
      (pr, containerTag, mergedPrNo) = defraUtils.getVariables(projectName, defraUtils.getPackageJsonVersion())
    }
    stage('Helm lint') {
      defraUtils.lintHelm(projectName)
    }
    stage('Build test image') {
      defraUtils.buildTestImage(projectName, dockerTestService, BUILD_NUMBER)
    }
    stage('Run tests') {
      defraUtils.runTests(projectName, dockerTestService, BUILD_NUMBER)
    }
    stage('Create JUnit report'){
      defraUtils.createTestReportJUnit()
    }
    stage('Fix lcov report') {
      defraUtils.replaceInFile(containerSrcFolder, localSrcFolder, lcovFile)
    }
    stage('SonarQube analysis') {
      defraUtils.analyseCode(sonarQubeEnv, sonarScanner, ['sonar.projectKey' : projectName, 'sonar.sources' : '.'])
    }
    stage("Code quality gate") {
      defraUtils.waitForQualityGateResult(timeoutInMinutes)
    }
    stage('Push container image') {
      defraUtils.buildAndPushContainerImage(regCredsId, registry, projectName, containerTag)
    }
    if (pr != '') {
      stage('Verify version incremented') {
        defraUtils.verifyPackageJsonVersionIncremented()
      }
      stage('Helm install') {
        withCredentials([
            string(credentialsId: 'albTags', variable: 'albTags'),
            string(credentialsId: 'albSecurityGroups', variable: 'albSecurityGroups'),
            string(credentialsId: 'albArn', variable: 'albArn'),
            string(credentialsId: 'ffc-demo-cookie-password', variable: 'cookiePassword')
          ]) {

          def helmValues = [
            /container.redeployOnChange="$pr-$BUILD_NUMBER"/,
            /cookiePassword="$cookiePassword"/,
            /ingress.alb.tags="$albTags"/,
            /ingress.alb.arn="$albArn"/,
            /ingress.alb.securityGroups="$albSecurityGroups"/,
            /ingress.endpoint="ffc-demo-$containerTag"/,
            /ingress.server="$ingressServer"/,
            /name="ffc-demo-$containerTag"/
          ].join(',')

          def extraCommands = [
            "--values ./helm/$projectName/jenkins-aws.yaml",
            "--set $helmValues"
          ].join(' ')

          defraUtils.deployChart(kubeCredsId, registry, projectName, containerTag, extraCommands)
          echo "Build available for review at https://ffc-demo-$containerTag.$ingressServer"
        }
      }
    }
    if (pr == '') {
      stage('Publish chart') {
        defraUtils.publishChart(registry, projectName, containerTag)
      }
      stage('Trigger GitHub release') {
        withCredentials([
          string(credentialsId: 'github_ffc_platform_repo', variable: 'gitToken')
        ]) {
          defraUtils.triggerRelease(containerTag, projectName, containerTag, gitToken)
        }
      }
      stage('Trigger Deployment') {
        withCredentials([
          string(credentialsId: 'JenkinsDeployUrl', variable: 'jenkinsDeployUrl'),
          string(credentialsId: 'ffc-demo-web-deploy-token', variable: 'jenkinsToken')
        ]) {
          defraUtils.triggerDeploy(jenkinsDeployUrl, deployJobName, jenkinsToken, ['chartVersion': containerTag])
        }
      }
    }
    if (mergedPrNo != '') {
      stage('Remove merged PR') {
        defraUtils.undeployChart(kubeCredsId, projectName, mergedPrNo)
      }
    }
    stage('Set GitHub status as success'){
      defraUtils.setGithubStatusSuccess()
    }
  } catch(e) {
    defraUtils.setGithubStatusFailure(e.message)
    defraUtils.notifySlackBuildFailure(e.message, "#generalbuildfailures")
    throw e
  } finally {
    defraUtils.deleteTestOutput(projectName)
  }
}
